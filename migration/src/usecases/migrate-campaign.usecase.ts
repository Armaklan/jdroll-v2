import { createHash, randomUUID } from 'node:crypto';
import { IEspritJdrSource, IJdrollTarget } from '../repositories/index.js';
import {
  buildSectionPlans,
  buildTopicPlans,
} from '../mappers/forum-structure.mapper.js';
import { mapCampaign, mapIntervenant } from '../mappers/espritjdr.mapper.js';
import { buildHjPrivateBlock } from '../mappers/hj.mapper.js';
import { MigrationReport, SourceIntervenant, SourceHjPost } from '../types.js';
import type { SectionPlan, TopicPlan } from '../mappers/forum-structure.mapper.js';
import {
  CampaignNotFoundError,
  CampaignAlreadyMigratedError,
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

    const [espaces, sections, groupes, themes, intervenants] = await Promise.all([
      this.source.getEspaces(campaignId),
      this.source.getSections(campaignId),
      this.source.getGroupes(campaignId),
      this.source.getThemes(campaignId),
      this.source.getIntervenantsByCampaign(campaignId),
    ]);

    const sectionPlans = buildSectionPlans(espaces, sections, groupes);
    const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

    if (existingTargetId !== null) {
      // Mode force : la campagne déjà migrée est supprimée puis réimportée
      const sourceKeys = await this.buildSourceKeys(campaignId, sectionPlans, topicPlans, intervenants);
      await this.target.deleteCampaignMigration(existingTargetId, sourceKeys);
      await this.imageDownloader.deleteCampaignFiles(existingTargetId);
    }

    const targetCampaignId = await this.target.createCampaignWithMapping(
      `campagne:${campaignId}`,
      mapCampaign(campaign, ownerUserId)
    );

    const { pnjIds, createdPnjs, images: pnjImages } = await this.importPnjs(intervenants, targetCampaignId);

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

      const postKeys = sourcePosts.map((post) => `post:${post.id}`);
      const migratedPostIds = await this.target.getMigrationTargetIds('post', postKeys);
      const postsToMigrate = sourcePosts.filter(
        (post) => !migratedPostIds.has(`post:${post.id}`)
      );

      skippedPosts += sourcePosts.length - postsToMigrate.length;

      if (postsToMigrate.length === 0) {
        continue;
      }

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
            userId: ownerUserId,
            persoId: pnjIds.get(post.intervenantId) ?? null,
            content: migrated.content,
            createDate: post.dateCreation,
          };
        })
      );

      await this.target.createPostsWithMapping(topicPlan.key, topicId, migratedPosts);
      posts += postsToMigrate.length;
    }

    return {
      sourceCampaignId: campaignId,
      targetCampaignId,
      ownerUserId,
      sections: sectionPlans.length,
      topics: topicPlans.length,
      pnjs: createdPnjs,
      images: pnjImages + postImages,
      posts,
      hjPosts,
      skippedPosts,
    };
  }

  /**
   * Toutes les clés de mapping espritjdr_migration rattachées à une campagne
   * source : campagne, sections, topics, PNJ et posts.
   */
  private async buildSourceKeys(
    campaignId: number,
    sectionPlans: SectionPlan[],
    topicPlans: TopicPlan[],
    intervenants: SourceIntervenant[]
  ): Promise<string[]> {
    const postIds = await this.source.getPostIdsByCampaign(campaignId);
    return [
      `campagne:${campaignId}`,
      ...sectionPlans.map((plan) => plan.key),
      ...topicPlans.map((plan) => plan.key),
      ...intervenants.map((intervenant) => `intervenant:${intervenant.id}`),
      ...postIds.map((postId) => `post:${postId}`),
    ];
  }

  /**
   * Importe les intervenants de type PJ (3) et PNJ (4) comme des PNJ jdroll.
   * L'avatar et les images inline des descriptions sont téléchargés dans
   * files/ et référencés par des urls jdroll.
   * Retourne la correspondance intervenant source -> perso cible, le nombre
   * de PNJ créés et d'images téléchargées lors de cette exécution.
   */
  private async importPnjs(
    intervenants: SourceIntervenant[],
    targetCampaignId: number
  ): Promise<{ pnjIds: Map<number, number>; createdPnjs: number; images: number }> {
    const pnjIds = new Map<number, number>();
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
    }

    return { pnjIds, createdPnjs, images };
  }

  /**
   * Télécharge les images inline espritjdr.net d'un contenu HTML et réécrit
   * leurs src vers les fichiers rapatriés. Les autres liens sont inchangés ;
   * un échec de téléchargement conserve le lien d'origine.
   */
  private async migrateContentImages(
    targetCampaignId: number,
    content: string
  ): Promise<{ content: string; images: number }> {
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
