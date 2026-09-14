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
import { CampaignNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

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
   * Récupère la liste des campagnes selon le rôle (master ou player) et le filtre d'archivage
   */
  async getMyCampaigns(userId: number, role: CampaignRole, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    if (role === 'master') {
      return this.getMyMasteredCampaigns(userId, includeArchived);
    }
    return this.getMyPlayerCampaigns(userId, includeArchived);
  }

  /**
   * Récupère la liste de toutes les campagnes (avec filtre d'archivage et recherche par nom/système/univers)
   */
  async getAllCampaigns(includeArchived: boolean = false, search?: string): Promise<CampaignSummary[]> {
    return this.campaignRepo.findAllCampaigns({ includeArchived, search });
  }

  /**
   * Récupère la galerie des personnages d'une campagne classés par catégorie
   */
  async getCampaignCharacters(campaignId: number, currentUserId?: number): Promise<CampaignCharactersData> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | undefined = undefined;
    if (currentUserId) {
      if (campaign.mjId === currentUserId) {
        userRole = 'mj';
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, currentUserId);
        if (isParticipant) {
          userRole = 'player';
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
        widgets: raw.widgets,
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
      },
      categories,
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
