import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IDicerRepository, dicerRepository, DicerRollWithUser } from '../repositories/dicer.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import { ICarteRepository, carteRepository } from '../repositories/carte.repository.js';
import {
  CampaignSummary,
  CampaignRole,
  CampaignCharactersData,
  CampaignCharacterCategory,
  CampaignCharacter,
  CampaignSearchResults,
  CampaignSearchTopicItem,
  CampaignSearchCarteItem,
  CampaignSearchCharacterItem,
  RawCampaignCharacterRow,
  CampaignAssistant,
} from '../types/index.js';
import { CampaignNotFoundError, CharacterNotFoundError, ForbiddenError } from '../errors/domain.errors.js';
import { resolveSheetMode } from '../schemas/sheet-definition.schema.js';
import { CampaignPermissionService, campaignPermissionService } from '../services/campaign-permission.service.js';

export class CampaignQueries {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly dicerRepo: IDicerRepository = dicerRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly carteRepo: ICarteRepository = carteRepository,
    private readonly campaignPermissions: CampaignPermissionService = campaignPermissionService
  ) {}

  /**
   * Récupère les campagnes maîtrisées par un utilisateur (MJ)
   */
  async getMyMasteredCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findMasteredCampaigns(userId, includeArchived);
  }

  /**
   * Récupère les campagnes où l'utilisateur participe en tant que joueur
   */
  async getMyPlayerCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findPlayerCampaigns(userId, includeArchived);
  }

  /**
   * Récupère les campagnes observées par l'utilisateur
   */
  async getMyObservedCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findObservedCampaigns(userId, includeArchived);
  }

  /**
   * Récupère la liste des campagnes selon le rôle (all, master, player ou observer) et le filtre d'archivage
   */
  async getMyCampaigns(userId: number, role: CampaignRole = 'all', includeArchived: boolean = false): Promise<CampaignSummary[]> {
    if (role === 'master') {
      return this.getMyMasteredCampaigns(userId, includeArchived);
    }
    if (role === 'player') {
      return this.getMyPlayerCampaigns(userId, includeArchived);
    }
    if (role === 'observer') {
      return this.getMyObservedCampaigns(userId, includeArchived);
    }

    const [mastered, player, observed] = await Promise.all([
      this.getMyMasteredCampaigns(userId, includeArchived),
      this.getMyPlayerCampaigns(userId, includeArchived),
      this.getMyObservedCampaigns(userId, includeArchived),
    ]);

    const campaignMap = new Map<number, CampaignSummary>();
    for (const c of mastered) {
      campaignMap.set(c.id, c);
    }
    for (const c of player) {
      if (!campaignMap.has(c.id)) {
        campaignMap.set(c.id, c);
      }
    }
    for (const c of observed) {
      if (!campaignMap.has(c.id)) {
        campaignMap.set(c.id, c);
      }
    }

    return Array.from(campaignMap.values()).sort((a, b) => {
      if (Boolean(a.hasAlert) !== Boolean(b.hasAlert)) {
        return a.hasAlert ? -1 : 1;
      }
      return b.id - a.id;
    });
  }

  /**
   * Récupère la liste de toutes les campagnes (avec filtre d'archivage, préparation et recherche par nom/système/univers)
   */
  async getAllCampaigns(includeArchived: boolean = false, search?: string, includePreparation: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findAllCampaigns({ includeArchived, search, includePreparation });
  }

  /**
   * Récupère la galerie des personnages d'une campagne classés par catégorie
   */
  async getCampaignCharacters(campaignId: number, currentUserId?: number): Promise<CampaignCharactersData> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | 'observer' | undefined = undefined;
    let isAssistantMj = false;
    let isObserving = false;
    let hasAlert = false;
    if (currentUserId) {
      hasAlert = this.campaignRepo.isUserCampaignAlert ? await this.campaignRepo.isUserCampaignAlert(campaignId, currentUserId) : false;
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
      } else if (await this.campaignPermissions.isAssistantMj(campaignId, currentUserId)) {
        userRole = 'mj';
        isAssistantMj = true;
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, currentUserId);
        if (isParticipant) {
          userRole = 'player';
        } else {
          isObserving = this.campaignRepo.isUserCampaignObserver ? await this.campaignRepo.isUserCampaignObserver(campaignId, currentUserId) : false;
          if (isObserving) {
            userRole = 'observer';
          }
        }
      }
    }

    const isMj = userRole === 'mj';
    const rawCategories = await this.campaignRepo.findCampaignPnjCategories(campaignId);
    const rawCharacters = await this.campaignRepo.findCampaignCharacters(campaignId);

    const categoryMap = new Map<number, { id: number; name: string; defaultCollapse: boolean; characters: CampaignCharacter[] }>();
    for (const cat of rawCategories) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        defaultCollapse: Boolean(cat.defaultCollapse),
        characters: [],
      });
    }

    const playerCharacters: CampaignCharacter[] = [];
    const uncategorizedPnj: CampaignCharacter[] = [];

    for (const raw of rawCharacters) {
      const isPlayer = raw.userId !== null && raw.userId !== undefined;
      const isOwner = Boolean(currentUserId && raw.userId === currentUserId);
      const canSeePrivate = isMj || isOwner;

      // Un personnage privé (statut = 1) n'apparaît que pour le MJ ou son propriétaire
      if (raw.statut === 1 && !canSeePrivate) {
        continue;
      }

      const character: CampaignCharacter = {
        id: raw.id,
        userId: raw.userId,
        userName: raw.userName || null,
        userAvatar: raw.userAvatar || null,
        campagneId: raw.campagneId,
        name: raw.name,
        concept: raw.concept || '',
        avatar: raw.avatar || '',
        publicDescription: raw.publicDescription || '',
        privateDescription: canSeePrivate ? (raw.privateDescription || '') : undefined,
        technical: canSeePrivate ? (raw.technical || '') : undefined,
        statut: raw.statut,
        catId: raw.catId,
        categoryName: '',
        isPlayer,
        persoFields: canSeePrivate ? raw.persoFields : undefined,
        sheetValues: canSeePrivate ? raw.sheetValues : undefined,
        widgets: canSeePrivate ? (raw.widgets || '') : undefined,
      };

      if (raw.catId && categoryMap.has(raw.catId)) {
        const cat = categoryMap.get(raw.catId)!;
        character.categoryName = cat.name;
        cat.characters.push(character);
      } else if (isPlayer) {
        character.categoryName = 'Personnage joueur';
        playerCharacters.push(character);
      } else {
        character.categoryName = 'Non classées';
        uncategorizedPnj.push(character);
      }
    }

    const categories: CampaignCharacterCategory[] = [];

    // 1. "Personnage joueur" category first if there are player characters
    if (playerCharacters.length > 0) {
      categories.push({
        id: null,
        name: 'Personnage joueur',
        defaultCollapse: false,
        characters: playerCharacters,
      });
    }

    // 2. Defined categories from pnj_category, alphabetically
    const sortedRawCategories = [...rawCategories].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const raw of sortedRawCategories) {
      const entry = categoryMap.get(raw.id);
      if (entry) {
        categories.push({
          id: entry.id,
          name: entry.name,
          defaultCollapse: entry.defaultCollapse,
          characters: entry.characters,
        });
      }
    }

    // 3. "Non classées" category last if there are uncategorized NPCs
    if (uncategorizedPnj.length > 0) {
      categories.push({
        id: null,
        name: 'Non classées',
        defaultCollapse: false,
        characters: uncategorizedPnj,
      });
    }

    return {
      campaign: {
        ...campaign,
        sheetMode: resolveSheetMode(campaign),
        userRole: userRole ?? campaign.userRole,
        isAssistantMj: isAssistantMj || Boolean(campaign.isAssistantMj),
        isObserving: isObserving || campaign.isObserving,
        hasAlert: hasAlert || Boolean(campaign.hasAlert),
      },
      categories,
    };
  }

  /**
   * Récupère un personnage spécifique et sa campagne associée avec application des droits d'accès
   */
  async getCharacter(characterId: number, currentUserId?: number): Promise<{ campaign: CampaignSummary; character: CampaignCharacter }> {
    const raw = await this.campaignRepo.findCharacterById(characterId);
    if (!raw) {
      throw new CharacterNotFoundError(`Le personnage avec l'identifiant ${characterId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(raw.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${raw.campagneId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | 'observer' | null = null;
    let isAssistantMj = false;
    let isObserving = false;
    let hasAlert = false;

    if (currentUserId) {
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
      } else if (await this.campaignPermissions.isAssistantMj(raw.campagneId, currentUserId)) {
        userRole = 'mj';
        isAssistantMj = true;
      } else {
        const isParticipant = await this.campaignRepo.isUserCampaignParticipant(raw.campagneId, currentUserId);
        if (isParticipant) {
          userRole = 'player';
        } else {
          isObserving = this.campaignRepo.isUserCampaignObserver ? await this.campaignRepo.isUserCampaignObserver(raw.campagneId, currentUserId) : false;
          if (isObserving) {
            userRole = 'observer';
          }
        }
      }
    }

    const isMj = userRole === 'mj';
    const isPlayer = raw.userId !== null && raw.userId !== undefined;
    const isOwner = Boolean(currentUserId && raw.userId === currentUserId);
    const canSeePrivate = isMj || isOwner;

    const character: CampaignCharacter = {
      id: raw.id,
      userId: raw.userId,
      userName: raw.userName || null,
      userAvatar: raw.userAvatar || null,
      userProfil: raw.userProfil || null,
      campagneId: raw.campagneId,
      name: raw.name,
      concept: raw.concept || '',
      avatar: raw.avatar || '',
      publicDescription: raw.publicDescription || '',
      privateDescription: canSeePrivate ? (raw.privateDescription || '') : undefined,
      technical: canSeePrivate ? (raw.technical || '') : undefined,
      statut: raw.statut,
      catId: raw.catId,
      categoryName: raw.categoryName || (isPlayer ? 'Personnage joueur' : 'Non classées'),
      isPlayer,
      persoFields: canSeePrivate ? raw.persoFields : undefined,
      sheetValues: canSeePrivate ? raw.sheetValues : undefined,
      templateHtml: campaign.templateHtml,
      templateImg: campaign.templateImg,
      templateFields: campaign.templateFields,
      widgets: canSeePrivate ? (raw.widgets || '') : undefined,
    };

    return {
      campaign: {
        ...campaign,
        sheetMode: resolveSheetMode(campaign),
        userRole: userRole ?? campaign.userRole,
        isAssistantMj: isAssistantMj || Boolean(campaign.isAssistantMj),
        isObserving: isObserving || campaign.isObserving,
        hasAlert: hasAlert || Boolean(campaign.hasAlert),
      },
      character,
    };
  }

  /**
   * Récupère les participants (joueurs) d'une campagne
   */
  async getCampaignParticipants(campaignId: number) {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }
    return this.campaignRepo.findCampaignParticipants(campaignId);
  }

  /**
   * Récupère les demandes d'inscription en attente d'une campagne (MJ uniquement)
   */
  async getPendingCampaignParticipants(campaignId: number, mjId: number) {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }
    if (campaign.mjId !== mjId) {
      throw new ForbiddenError("Seul le Maître du Jeu peut consulter les inscriptions en attente");
    }
    return this.campaignRepo.findPendingCampaignParticipants(campaignId);
  }

  /**
   * Récupère une campagne par son identifiant avec le rôle de l'utilisateur
   */
  async getCampaignById(campaignId: number, currentUserId?: number): Promise<CampaignSummary> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | 'observer' | undefined = undefined;
    let isAssistantMj = false;
    let isObserving = false;
    let hasAlert = false;
    if (currentUserId) {
      hasAlert = this.campaignRepo.isUserCampaignAlert ? await this.campaignRepo.isUserCampaignAlert(campaignId, currentUserId) : false;
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
      } else if (await this.campaignPermissions.isAssistantMj(campaignId, currentUserId)) {
        userRole = 'mj';
        isAssistantMj = true;
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, currentUserId);
        if (isParticipant) {
          userRole = 'player';
        } else {
          isObserving = this.campaignRepo.isUserCampaignObserver ? await this.campaignRepo.isUserCampaignObserver(campaignId, currentUserId) : false;
          if (isObserving) {
            userRole = 'observer';
          }
        }
      }
    }

    return {
      ...campaign,
      sheetMode: resolveSheetMode(campaign),
      userRole: userRole ?? campaign.userRole,
      isAssistantMj: isAssistantMj || Boolean(campaign.isAssistantMj),
      isObserving: isObserving || campaign.isObserving,
      hasAlert: hasAlert || Boolean(campaign.hasAlert),
    };
  }

  /**
   * Récupère les MJ Assistants d'une campagne (MJ propriétaire uniquement)
   */
  async getCampaignAssistants(campaignId: number, mjId: number): Promise<CampaignAssistant[]> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }
    if (campaign.mjId !== mjId) {
      throw new ForbiddenError("Seul le Maître du Jeu peut consulter la liste des MJ Assistants");
    }
    return this.campaignRepo.findCampaignAssistants ? this.campaignRepo.findCampaignAssistants(campaignId) : [];
  }

  /**
   * Récupère les 20 derniers jets de dés de la campagne
   * - MJ : tous les jets de la campagne
   * - Joueur : uniquement ses propres jets de la campagne
   */
  async getCampaignDiceRolls(campaignId: number, userId: number): Promise<DicerRollWithUser[]> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === userId || (await this.forumRepo.userHasMjRights(campaignId, userId));
    const isParticipant = isMj ? true : await this.forumRepo.isUserCampaignParticipant(campaignId, userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à consulter la tour à dés de cette campagne");
    }

    if (isMj) {
      return this.dicerRepo.getRecentRollsByCampaign(campaignId, 20);
    }

    return this.dicerRepo.getRecentRollsByCampaign(campaignId, 20, userId);
  }

  /**
   * Effectue une recherche dans la campagne (topics, cartes, personnages) selon les droits d'accès
   */
  async searchCampaign(
    campaignId: number,
    queryText: string = '',
    currentUserId?: number
  ): Promise<CampaignSearchResults> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    const isMj = Boolean(currentUserId && (campaign.mjId === currentUserId || (await this.forumRepo.userHasMjRights(campaignId, currentUserId))));

    const [topicRows, carteRows, characterRows] = await Promise.all([
      this.forumRepo.searchCampaignTopics(campaignId, queryText, currentUserId, isMj),
      this.carteRepo.searchCampaignCartes(campaignId, queryText, isMj),
      this.campaignRepo.searchCampaignCharacters(campaignId, queryText, isMj, currentUserId),
    ]);

    const topics: CampaignSearchTopicItem[] = topicRows.map((t) => ({
      id: t.id,
      title: t.title,
      sectionId: t.sectionId,
      sectionTitle: t.sectionTitle,
      isPrivate: t.isPrivate === 1,
      url: `/forum/${campaignId}/${t.id}`,
    }));

    const cartes: CampaignSearchCarteItem[] = carteRows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      image: c.image || null,
      published: c.published,
      url: `/campaigns/${campaignId}/cartes/${c.id}`,
    }));

    const characters: CampaignSearchCharacterItem[] = characterRows.map((p) => ({
      id: p.id,
      name: p.name,
      concept: p.concept || '',
      avatar: p.avatar || null,
      categoryName: p.categoryName || (p.userId ? 'Personnage joueur' : 'Non classées'),
      isPlayer: Boolean(p.userId),
      url: `/campaigns/${campaignId}/characters?char=${p.id}`,
    }));

    return {
      topics,
      cartes,
      characters,
    };
  }

  /**
   * Résout un personnage d'une campagne par identifiant (id numérique ou nom exact, insensible à la casse),
   * y compris les personnages privés (statut = 1) : les droits d'accès s'appliquent ensuite à la lecture de la fiche.
   */
  async resolveCampaignCharacter(campaignId: number, identifier: string): Promise<{ id: number; name: string }> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    const trimmed = identifier.trim();
    if (!trimmed) {
      throw new CharacterNotFoundError('Aucun personnage ne correspond à cet identifiant');
    }

    const numericId = Number(trimmed);
    let raw: RawCampaignCharacterRow | null = null;

    if (!isNaN(numericId) && numericId > 0 && String(numericId) === trimmed) {
      const byId = await this.campaignRepo.findCharacterById(numericId);
      raw = byId && byId.campagneId === campaignId ? byId : null;
    } else if (this.campaignRepo.findCampaignCharacterByName) {
      raw = await this.campaignRepo.findCampaignCharacterByName(campaignId, trimmed);
    }

    if (!raw) {
      throw new CharacterNotFoundError(`Aucun personnage ne correspond à « ${trimmed} » dans cette campagne`);
    }

    return { id: raw.id, name: raw.name };
  }
}

export const campaignQueries = new CampaignQueries();
