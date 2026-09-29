import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { IAbsenceRepository, absenceRepository } from '../repositories/absence.repository.js';
import {
  ICampaignRepository,
  campaignRepository,
} from '../repositories/campaign.repository.js';
import { User, PublicUserProfile, ProfileCampaign, CampaignSummary, MemberSummary } from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

/** Campagne visible sur un profil public : jamais en préparation (statut 3). */
function isVisibleOnProfile(campaign: CampaignSummary): boolean {
  return campaign.statut !== 3;
}

function toProfileCampaign(campaign: CampaignSummary): ProfileCampaign {
  return { id: campaign.id, name: campaign.name, isArchived: campaign.statut === 2 };
}

/**
 * Campagnes visibles sur le profil public, dédoublonnées par campagne
 * (un joueur peut y avoir plusieurs personnages) et triées :
 * campagnes ouvertes d'abord, archivées ensuite.
 */
function toProfileCampaigns(campaigns: CampaignSummary[]): ProfileCampaign[] {
  const byId = new Map<number, ProfileCampaign>();
  for (const campaign of campaigns) {
    if (!isVisibleOnProfile(campaign) || byId.has(campaign.id)) continue;
    byId.set(campaign.id, toProfileCampaign(campaign));
  }
  return [...byId.values()].sort((a, b) => Number(a.isArchived) - Number(b.isArchived));
}

export class UserQueries {
  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly absenceRepo: IAbsenceRepository = absenceRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository
  ) {}

  /**
   * Récupère le profil d'un utilisateur par son ID (pour /api/auth/me ou consultation profil)
   * Lève une UserNotFoundError si l'utilisateur n'existe pas.
   */
  async getUserProfile(userId: number): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }
    return user;
  }

  /**
   * Récupère un utilisateur par son identifiant ou retourne null s'il n'existe pas.
   */
  async getUserById(userId: number): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  /**
   * Liste des membres : uniquement les utilisateurs ayant publié au moins 1 post.
   * N'expose ni le mail, ni les paramètres de notification.
   */
  async getMembers(): Promise<MemberSummary[]> {
    return this.userRepo.findMembersWithAtLeastOnePost();
  }

  /**
   * Récupère le profil public d'un utilisateur (consultation par un autre membre) :
   * nom, avatar, description, titre, absences en cours, parties maîtrisées
   * et parties jouées (nom uniquement, sans indicateur de lecture ni d'alerte).
   * N'expose ni le mail, ni les paramètres de notification.
   * Lève une UserNotFoundError si l'utilisateur n'existe pas.
   */
  async getPublicProfile(userId: number): Promise<PublicUserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }

    const [currentAbsences, masteredCampaigns, playedCampaigns, lastActionDate] = await Promise.all([
      this.absenceRepo.findCurrentByUser(userId),
      this.campaignRepo.findMasteredCampaigns(userId, true),
      this.campaignRepo.findPlayerCampaigns(userId, true),
      this.userRepo.findLastActionDateByUser(userId),
    ]);

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      description: user.description,
      titre: user.titre,
      profil: user.profil,
      subscribeDate: user.subscribe_date,
      birthDate: user.birthDate ?? null,
      lastActionDate,
      currentAbsences,
      masteredCampaigns: toProfileCampaigns(masteredCampaigns),
      playedCampaigns: toProfileCampaigns(playedCampaigns),
    };
  }
}

export const userQueries = new UserQueries();
