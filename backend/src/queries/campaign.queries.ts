import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IDicerRepository, dicerRepository, DicerRollWithUser } from '../repositories/dicer.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import {
  CampaignSummary,
  CampaignRole,
  CampaignCharactersData,
  CampaignCharacterCategory,
  CampaignCharacter,
} from '../types/index.js';
import { CampaignNotFoundError, CharacterNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

export class CampaignQueries {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly dicerRepo: IDicerRepository = dicerRepository,
    private readonly forumRepo: IForumRepository = forumRepository
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
    let isObserving = false;
    let hasAlert = false;
    if (currentUserId) {
      hasAlert = this.campaignRepo.isUserCampaignAlert ? await this.campaignRepo.isUserCampaignAlert(campaignId, currentUserId) : false;
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
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
        persoFields: raw.persoFields,
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

    // 1. Defined categories from pnj_category
    for (const cat of rawCategories) {
      const entry = categoryMap.get(cat.id);
      if (entry) {
        categories.push({
          id: entry.id,
          name: entry.name,
          defaultCollapse: entry.defaultCollapse,
          characters: entry.characters,
        });
      }
    }

    // 2. "Personnage joueur" category if there are player characters
    if (playerCharacters.length > 0) {
      categories.push({
        id: null,
        name: 'Personnage joueur',
        defaultCollapse: false,
        characters: playerCharacters,
      });
    }

    // 3. "Non classées" category if there are uncategorized NPCs
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
        userRole: userRole ?? campaign.userRole,
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
    let isObserving = false;
    let hasAlert = false;

    if (currentUserId) {
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
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
      persoFields: raw.persoFields,
      templateHtml: campaign.templateHtml,
      templateImg: campaign.templateImg,
      templateFields: campaign.templateFields,
      widgets: canSeePrivate ? (raw.widgets || '') : undefined,
    };

    return {
      campaign: {
        ...campaign,
        userRole: userRole ?? campaign.userRole,
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
   * Récupère une campagne par son identifiant avec le rôle de l'utilisateur
   */
  async getCampaignById(campaignId: number, currentUserId?: number): Promise<CampaignSummary> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | 'observer' | undefined = undefined;
    let isObserving = false;
    let hasAlert = false;
    if (currentUserId) {
      hasAlert = this.campaignRepo.isUserCampaignAlert ? await this.campaignRepo.isUserCampaignAlert(campaignId, currentUserId) : false;
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
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
      userRole: userRole ?? campaign.userRole,
      isObserving: isObserving || campaign.isObserving,
      hasAlert: hasAlert || Boolean(campaign.hasAlert),
    };
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

    const isMj = campaign.mjId === userId || (await this.forumRepo.isUserCampaignMj(campaignId, userId));
    const isParticipant = isMj ? true : await this.forumRepo.isUserCampaignParticipant(campaignId, userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à consulter la tour à dés de cette campagne");
    }

    if (isMj) {
      return this.dicerRepo.getRecentRollsByCampaign(campaignId, 20);
    }

    return this.dicerRepo.getRecentRollsByCampaign(campaignId, 20, userId);
  }
}

export const campaignQueries = new CampaignQueries();
