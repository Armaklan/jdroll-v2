import { createHash, randomUUID } from 'node:crypto';
import { IEspritJdrSource, IJdrollTarget } from '../repositories/index.js';
import {
  buildSectionPlans,
  buildTopicPlans,
} from '../mappers/forum-structure.mapper.js';
import { mapCampaign, mapIntervenant } from '../mappers/espritjdr.mapper.js';
import { buildHjPrivateBlock } from '../mappers/hj.mapper.js';
import { buildDicePostContent, mapDiceRequest } from '../mappers/dice.mapper.js';
import { mapFicheToSheetTemplate, serializeSheetFields } from '../mappers/sheet.mapper.js';
import {
  MigrationReport,
  SheetMigrationReport,
  SourceIntervenant,
  SourceMjIntervenant,
  SourceHjPost,
  SourceDiceRequest,
  NewPostData,
  NewDiceRollData,
} from '../types.js';
import type { SectionPlan, TopicPlan } from '../mappers/forum-structure.mapper.js';
import {
  CampaignNotFoundError,
  CampaignAlreadyMigratedError,
  FicheNotFoundError,
} from '../errors/migration.errors.js';
import {
  IImageDownloader,
  isDownloadableImageUrl,
  isEspritJdrImageUrl,
  buildAvatarFilename,
  buildInlineImageFilename,
  extractInlineImageUrls,
  replaceInlineImageUrls,
} from '../files/image-downloader.js';

export interface MigrateCampaignOptions {
  userName: string;
  userMail: string;
  /** Supprime la campagne jdroll déjà migrée puis la réimporte intégralement. */
  force: boolean;
  /** Ne télécharge pas les images : les liens d'origine sont conservés. */
  noImages: boolean;
  /**
   * Fiche du générateur espritjdr (generateur_fiche.ID) convertie en fiche
   * codée jdroll et appliquée à la campagne migrée. Null : pas de fiche.
   */
  ficheId: number | null;
}

export class MigrateCampaignUseCase {
  constructor(
    private readonly source: IEspritJdrSource,
    private readonly target: IJdrollTarget,
    private readonly options: MigrateCampaignOptions,
    private readonly imageDownloader: IImageDownloader
  ) {}

  async execute(campaignId: number): Promise<MigrationReport> {
    await this.target.ensureMigrationTable();

    const existingTargetId = await this.target.getMigrationTargetId('campagne', `campagne:${campaignId}`);
    if (existingTargetId !== null && !this.options.force) {
      throw new CampaignAlreadyMigratedError(campaignId, existingTargetId);
    }

    const campaign = await this.source.getCampaign(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const ownerUserId = await this.ensureOwnerUser();

    const [espaces, sections, groupes, themes, intervenants, mjIntervenants, diceRequests] =
      await Promise.all([
        this.source.getEspaces(campaignId),
        this.source.getSections(campaignId),
        this.source.getGroupes(campaignId),
        this.source.getThemes(campaignId),
        this.source.getIntervenantsByCampaign(campaignId),
        this.source.getMjIntervenantsByCampaign(campaignId),
        this.source.getDiceRequestsByCampaign(campaignId),
      ]);

    const sectionPlans = buildSectionPlans(espaces, sections, groupes, themes);
    const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

    if (existingTargetId !== null) {
      // Mode force : la campagne déjà migrée est supprimée puis réimportée
      const sourceKeys = await this.buildSourceKeys(
        campaignId,
        sectionPlans,
        topicPlans,
        intervenants,
        diceRequests
      );
      await this.target.deleteCampaignMigration(existingTargetId, sourceKeys);
      await this.imageDownloader.deleteCampaignFiles(existingTargetId);
    }

    const targetCampaignId = await this.target.createCampaignWithMapping(
      `campagne:${campaignId}`,
      mapCampaign(campaign, ownerUserId)
    );

    // Un CREA (type 1) unique rattaché à un utilisateur jdroll connu prend
    // la campagne à la place de l'utilisateur technique.
    const mjUserId = await this.reassignCampaignMj(targetCampaignId, mjIntervenants, ownerUserId);

    // Les MJ (type 2) rattachés à des utilisateurs jdroll connus sont ajoutés
    // à la campagne comme MJ assistants (statut 2), sauf l'utilisateur qui
    // est déjà MJ de la campagne (lié à la fois au CREA et à un MJ).
    const assistants = await this.addAssistantMjs(targetCampaignId, mjIntervenants, mjUserId);

    const { pnjIds, createdPnjs, images: pnjImages, participants, userIdsByIntervenant } =
      await this.importPnjs(intervenants, targetCampaignId, mjUserId);

    const sectionIds = new Map<string, number>();
    for (const sectionPlan of sectionPlans) {
      const existingSectionId = await this.target.getMigrationTargetId('section', sectionPlan.key);
      if (existingSectionId !== null) {
        sectionIds.set(sectionPlan.key, existingSectionId);
        continue;
      }
      const sectionId = await this.target.createSectionWithMapping(sectionPlan.key, {
        campagneId: targetCampaignId,
        title: sectionPlan.title,
        ordre: sectionPlan.ordre,
      });
      sectionIds.set(sectionPlan.key, sectionId);
    }

    let posts = 0;
    let skippedPosts = 0;
    let postImages = 0;
    let hjPosts = 0;
    let dicePosts = 0;

    // Demandes de jet de dés : regroupées par post lié ; l'état de migration
    // (ligne dicer, post de jet) est suivi par clés de mapping distinctes.
    const diceByPostId = new Map<number, SourceDiceRequest[]>();
    for (const request of diceRequests) {
      if (request.postThemeId === null) {
        continue;
      }
      const list = diceByPostId.get(request.postThemeId) ?? [];
      list.push(request);
      diceByPostId.set(request.postThemeId, list);
    }
    const migratedDiceRollKeys = await this.target.getMigrationTargetIds(
      'demande_jet',
      diceRequests.map((request) => `demande_jet:${request.id}`)
    );
    const migratedDicePostKeys = await this.target.getMigrationTargetIds(
      'demande_jet',
      diceRequests
        .filter((request) => request.postThemeId !== null)
        .map((request) => `demande_jet_post:${request.id}`)
    );
    // Date de création source de chaque post de la campagne : une demande de
    // jet n'a pas de date propre, elle prend celle du post lié.
    const postDatesById = new Map<number, string>();

    for (const topicPlan of topicPlans) {
      let topicId = await this.target.getMigrationTargetId('topic', topicPlan.key);
      if (topicId === null) {
        topicId = await this.target.createTopicWithMapping(topicPlan.key, {
          sectionId: sectionIds.get(topicPlan.sectionKey) as number,
          title: topicPlan.title,
          isClosed: topicPlan.isClosed,
          ordre: topicPlan.ordre,
        });
      }

      const sourcePosts = await this.source.getPostsByTheme(topicPlan.themeId);
      if (sourcePosts.length === 0) {
        continue;
      }

      for (const post of sourcePosts) {
        postDatesById.set(post.id, post.dateCreation);
      }

      const postKeys = sourcePosts.map((post) => `post:${post.id}`);
      const migratedPostIds = await this.target.getMigrationTargetIds('post', postKeys);
      const postsToMigrate = sourcePosts.filter(
        (post) => !migratedPostIds.has(`post:${post.id}`)
      );

      skippedPosts += sourcePosts.length - postsToMigrate.length;

      // Demandes de jet du thème dont le post de jet n'existe pas encore
      const topicDiceRequests = sourcePosts
        .flatMap((post) => diceByPostId.get(post.id) ?? [])
        .filter((request) => !migratedDicePostKeys.has(`demande_jet_post:${request.id}`));

      if (postsToMigrate.length === 0 && topicDiceRequests.length === 0) {
        continue;
      }

      const postItems: NewPostData[] = [];

      if (postsToMigrate.length > 0) {
        // HJ rattachés aux posts du thème : fusionnés dans le post principal
        // au sein d'un bloc [private=nom de l'intervenant]
        const hjPostsByPostId = new Map<number, SourceHjPost[]>();
        for (const hjPost of await this.source.getHjPostsByTheme(topicPlan.themeId)) {
          const list = hjPostsByPostId.get(hjPost.postThemeId) ?? [];
          list.push(hjPost);
          hjPostsByPostId.set(hjPost.postThemeId, list);
        }

        const migratedPosts = await Promise.all(
          postsToMigrate.map(async (post) => {
            const postHjPosts = hjPostsByPostId.get(post.id) ?? [];
            const hjBlocks = postHjPosts.map((hjPost) => buildHjPrivateBlock(hjPost)).join('\n');
            const content = hjBlocks === '' ? post.contenu : `${post.contenu}\n${hjBlocks}`;
            hjPosts += postHjPosts.length;
            const migrated = await this.migrateContentImages(targetCampaignId, content);
            postImages += migrated.images;
            return {
              sourceId: post.id,
              // Auteur : utilisateur jdroll rattaché à l'intervenant du post,
              // sinon l'utilisateur technique.
              userId: userIdsByIntervenant.get(post.intervenantId) ?? ownerUserId,
              persoId: pnjIds.get(post.intervenantId) ?? null,
              content: migrated.content,
              createDate: post.dateCreation,
            };
          })
        );

        for (const migrated of migratedPosts) {
          postItems.push({
            mappingKey: `post:${migrated.sourceId}`,
            userId: migrated.userId,
            persoId: migrated.persoId,
            content: migrated.content,
            createDate: migrated.createDate,
          });
          // Posts de jet de dés juste après le post lié
          for (const request of diceByPostId.get(migrated.sourceId) ?? []) {
            if (migratedDicePostKeys.has(`demande_jet_post:${request.id}`)) {
              continue;
            }
            postItems.push(this.buildDicePostItem(request, migrated.createDate));
            dicePosts += 1;
          }
        }
      }

      // Jets liés à des posts déjà migrés : impossible à intercaler, le post de
      // jet est ajouté en fin du topic du post lié, daté du post lié.
      for (const request of topicDiceRequests) {
        if (postsToMigrate.some((post) => post.id === request.postThemeId)) {
          continue;
        }
        postItems.push(
          this.buildDicePostItem(
            request,
            postDatesById.get(request.postThemeId as number) ?? ''
          )
        );
        dicePosts += 1;
      }

      if (postItems.length === 0) {
        continue;
      }

      await this.target.createPostsWithMapping(topicId, postItems);
      posts += postsToMigrate.length;
    }

    // Une ligne dicer par demande de jet : attribuée au joueur jdroll de
    // l'intervenant destinataire du jet, sinon à l'utilisateur technique.
    const mjUserIdsByIntervenant = await this.buildMjUserIdsByIntervenant(mjIntervenants);
    const diceRolls: NewDiceRollData[] = diceRequests
      .filter((request) => !migratedDiceRollKeys.has(`demande_jet:${request.id}`))
      .map((request) =>
        mapDiceRequest(
          request,
          targetCampaignId,
          userIdsByIntervenant.get(request.intervenantToId)
            ?? mjUserIdsByIntervenant.get(request.intervenantToId)
            ?? ownerUserId,
          request.postThemeId !== null
            ? postDatesById.get(request.postThemeId) ?? null
            : null
        )
      );
    await this.target.createDiceRollsWithMapping(diceRolls);

    const sheet = await this.applySheet(targetCampaignId);

    return {
      sourceCampaignId: campaignId,
      targetCampaignId,
      ownerUserId,
      mjUserId,
      sections: sectionPlans.length,
      topics: topicPlans.length,
      pnjs: createdPnjs,
      images: pnjImages + postImages,
      posts,
      diceRolls: diceRolls.length,
      dicePosts,
      hjPosts,
      skippedPosts,
      participants,
      assistants,
      sheet,
    };
  }

  /**
   * Convertit la fiche du générateur demandée (--fiche-id) en fiche codée
   * jdroll et l'applique à campagne_config de la campagne migrée (fond,
   * champs, couleur du texte). Idempotent : une fiche déjà appliquée
   * (mapping `fiche:<id>`) n'est pas reappliquée.
   */
  private async applySheet(targetCampaignId: number): Promise<SheetMigrationReport | null> {
    const ficheId = this.options.ficheId;
    if (ficheId === null) {
      return null;
    }

    const key = `fiche:${ficheId}`;
    if ((await this.target.getMigrationTargetId('generateur_fiche', key)) !== null) {
      return null;
    }

    const fiche = await this.source.getFiche(ficheId);
    if (!fiche) {
      throw new FicheNotFoundError(ficheId);
    }

    const plan = mapFicheToSheetTemplate(fiche.contenuXml);
    const background = await this.downloadSheetBackground(targetCampaignId, plan.backgroundImage);

    await this.target.applyCampaignSheet(key, targetCampaignId, {
      templateImg: background ?? plan.backgroundImage,
      templateFields: serializeSheetFields(plan.fields),
      textColor: plan.textColor,
    });

    return {
      sourceFicheId: fiche.id,
      ficheNom: fiche.nom,
      fields: plan.fields.length,
      unsupported: plan.unsupported,
    };
  }

  /** Télécharge le fond de fiche espritjdr dans files/ ; null si non applicable. */
  private async downloadSheetBackground(
    targetCampaignId: number,
    backgroundImage: string | null
  ): Promise<string | null> {
    if (this.options.noImages || !isDownloadableImageUrl(backgroundImage)) {
      return null;
    }
    const sourceUrl = (backgroundImage as string).trim();
    return this.imageDownloader.downloadToCampaign(
      targetCampaignId,
      buildInlineImageFilename(sourceUrl),
      sourceUrl
    );
  }

  /**
   * Toutes les clés de mapping espritjdr_migration rattachées à une campagne
   * source : campagne, sections, topics, PNJ, posts et demandes de jet.
   */
  private async buildSourceKeys(
    campaignId: number,
    sectionPlans: SectionPlan[],
    topicPlans: TopicPlan[],
    intervenants: SourceIntervenant[],
    diceRequests: SourceDiceRequest[]
  ): Promise<string[]> {
    const postIds = await this.source.getPostIdsByCampaign(campaignId);
    return [
      `campagne:${campaignId}`,
      ...sectionPlans.map((plan) => plan.key),
      ...topicPlans.map((plan) => plan.key),
      ...intervenants.map((intervenant) => `intervenant:${intervenant.id}`),
      ...postIds.map((postId) => `post:${postId}`),
      ...diceRequests.flatMap((request) => {
        const keys = [`demande_jet:${request.id}`];
        if (request.postThemeId !== null) {
          keys.push(`demande_jet_post:${request.id}`);
        }
        return keys;
      }),
      ...(this.options.ficheId !== null ? [`fiche:${this.options.ficheId}`] : []),
    ];
  }

  /** Post de jet de dés : carte du site, sans auteur ni perso. */
  private buildDicePostItem(request: SourceDiceRequest, createDate: string): NewPostData {
    return {
      mappingKey: `demande_jet_post:${request.id}`,
      userId: null,
      persoId: null,
      content: buildDicePostContent(request),
      createDate,
    };
  }

  /** Utilisateur jdroll de chaque intervenant MJ (CREA/MJ) connu par son pseudo. */
  private async buildMjUserIdsByIntervenant(
    mjIntervenants: SourceMjIntervenant[]
  ): Promise<Map<number, number>> {
    const mjUserIdsByIntervenant = new Map<number, number>();
    for (const intervenant of mjIntervenants) {
      const userId = await this.findTargetUserId(intervenant.utilisateurPseudo);
      if (userId !== null) {
        mjUserIdsByIntervenant.set(intervenant.id, userId);
      }
    }
    return mjUserIdsByIntervenant;
  }

  /**
   * Un CREA (type 1) unique, lié à un utilisateur espritjdr dont le pseudo
   * correspond à un utilisateur jdroll, devient MJ de la campagne migrée.
   * Sinon la campagne reste à l'utilisateur technique.
   * Retourne l'id du MJ final de la campagne.
   */
  private async reassignCampaignMj(
    targetCampaignId: number,
    mjIntervenants: SourceMjIntervenant[],
    ownerUserId: number
  ): Promise<number> {
    const creas = mjIntervenants.filter((intervenant) => intervenant.typeIntervenantId === 1);
    if (creas.length !== 1) {
      return ownerUserId;
    }

    const userId = await this.findTargetUserId(creas[0].utilisateurPseudo);
    if (userId === null) {
      return ownerUserId;
    }

    await this.target.setCampaignMj(targetCampaignId, userId);
    return userId;
  }

  /**
   * Les MJ (type 2) liés à un utilisateur espritjdr dont le pseudo correspond
   * à un utilisateur jdroll sont ajoutés à la campagne comme MJ assistants
   * (campagne_participant.statut = 2), sauf l'utilisateur qui est déjà MJ de
   * la campagne : lié au CREA et à un MJ, il est considéré juste MJ.
   * Retourne le nombre d'assistants ajoutés.
   */
  private async addAssistantMjs(
    targetCampaignId: number,
    mjIntervenants: SourceMjIntervenant[],
    mjUserId: number
  ): Promise<number> {
    let assistants = 0;

    for (const intervenant of mjIntervenants) {
      if (intervenant.typeIntervenantId !== 2) {
        continue;
      }
      const userId = await this.findTargetUserId(intervenant.utilisateurPseudo);
      if (userId === null || userId === mjUserId) {
        continue;
      }
      await this.target.addCampaignParticipant(targetCampaignId, userId, 2);
      assistants += 1;
    }

    return assistants;
  }

  /** Retrouve l'utilisateur jdroll portant le même pseudo qu'un utilisateur espritjdr. */
  private async findTargetUserId(pseudo: string | null): Promise<number | null> {
    if (pseudo === null || pseudo.trim() === '') {
      return null;
    }
    return this.target.findUserIdByUsername(pseudo.trim());
  }

  /**
   * Importe les intervenants de type PJ (3) et PNJ (4) comme des PNJ jdroll.
   * L'avatar et les images inline des descriptions sont téléchargés dans
   * files/ et référencés par des urls jdroll.
   * Si l'intervenant est lié à un utilisateur espritjdr dont le pseudo
   * correspond à un utilisateur jdroll : le personnage migré lui est associé
   * et il est ajouté aux participants de la campagne (validé), sauf s'il est
   * déjà le MJ de la campagne (le MJ n'est pas participant).
   * Retourne la correspondance intervenant source -> perso cible, le nombre
   * de PNJ créés, d'images téléchargées et d'utilisateurs rattachés, et la
   * correspondance intervenant source -> utilisateur jdroll rattaché.
   */
  private async importPnjs(
    intervenants: SourceIntervenant[],
    targetCampaignId: number,
    mjUserId: number
  ): Promise<{
    pnjIds: Map<number, number>;
    createdPnjs: number;
    images: number;
    participants: number;
    userIdsByIntervenant: Map<number, number>;
  }> {
    const pnjIds = new Map<number, number>();
    const userIdsByIntervenant = new Map<number, number>();
    let createdPnjs = 0;
    let images = 0;

    for (const intervenant of intervenants) {
      const key = `intervenant:${intervenant.id}`;
      let persoId = await this.target.getMigrationTargetId('intervenant', key);
      if (persoId === null) {
        const avatar = await this.downloadAvatar(targetCampaignId, intervenant);
        if (avatar !== null) {
          images += 1;
        }

        const pnjData = mapIntervenant(intervenant, targetCampaignId, avatar ?? '');
        const publicDescription = await this.migrateContentImages(targetCampaignId, pnjData.publicDescription);
        const privateDescription = await this.migrateContentImages(targetCampaignId, pnjData.privateDescription);
        pnjData.publicDescription = publicDescription.content;
        pnjData.privateDescription = privateDescription.content;
        images += publicDescription.images + privateDescription.images;

        persoId = await this.target.createPnjWithMapping(key, pnjData);
        createdPnjs += 1;
      }
      pnjIds.set(intervenant.id, persoId);

      const userId = await this.findTargetUserId(intervenant.utilisateurPseudo);
      if (userId !== null) {
        if (userId !== mjUserId) {
          await this.target.addCampaignParticipant(targetCampaignId, userId, 1);
        }
        await this.target.attachPersoToUser(persoId, userId);
        userIdsByIntervenant.set(intervenant.id, userId);
      }
    }

    return {
      pnjIds,
      createdPnjs,
      images,
      participants: new Set(
        [...userIdsByIntervenant.values()].filter((userId) => userId !== mjUserId)
      ).size,
      userIdsByIntervenant,
    };
  }

  /**
   * Télécharge les images inline espritjdr.net d'un contenu HTML et réécrit
   * leurs src vers les fichiers rapatriés. Les autres liens sont inchangés ;
   * un échec de téléchargement conserve le lien d'origine. En mode --noimg,
   * aucun téléchargement n'est effectué.
   */
  private async migrateContentImages(
    targetCampaignId: number,
    content: string
  ): Promise<{ content: string; images: number }> {
    if (this.options.noImages) {
      return { content, images: 0 };
    }

    const urls = extractInlineImageUrls(content).filter(isEspritJdrImageUrl);
    const replacements = new Map<string, string>();

    for (const url of urls) {
      const downloaded = await this.imageDownloader.downloadToCampaign(
        targetCampaignId,
        buildInlineImageFilename(url),
        url
      );
      if (downloaded !== null) {
        replacements.set(url, downloaded);
      }
    }

    return {
      content: replaceInlineImageUrls(content, replacements),
      images: replacements.size,
    };
  }

  private async downloadAvatar(
    targetCampaignId: number,
    intervenant: SourceIntervenant
  ): Promise<string | null> {
    if (this.options.noImages) {
      return null;
    }
    if (!isDownloadableImageUrl(intervenant.image)) {
      return null;
    }
    const sourceUrl = intervenant.image.trim();
    return this.imageDownloader.downloadToCampaign(
      targetCampaignId,
      buildAvatarFilename(intervenant.id, sourceUrl),
      sourceUrl
    );
  }

  private async ensureOwnerUser(): Promise<number> {
    const existingUserId = await this.target.findUserIdByUsername(this.options.userName);
    if (existingUserId !== null) {
      return existingUserId;
    }

    // Mot de passe aléatoire non communicable : compte technique.
    const passwordHash = createHash('md5')
      .update(`${randomUUID()}-${Date.now()}`)
      .digest('hex');

    return this.target.createUser({
      username: this.options.userName,
      mail: this.options.userMail,
      passwordHash,
      description: 'Compte technique regroupant les données migrées depuis EspritJDR.',
    });
  }
}
