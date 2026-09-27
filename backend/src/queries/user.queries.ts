import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { IAbsenceRepository, absenceRepository } from '../repositories/absence.repository.js';
import {
  ICampaignRepository,
  campaignRepository,
} from '../repositories/campaign.repository.js';
import { User, PublicUserProfile, ProfileCampaign, CampaignSummary } from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

/** Campagne visible sur un profil public : jamais en préparation (statut 3). */
function isVisibleOnProfile(campaign: CampaignSummary): boolean {
  return campaign.statut !== 3;
}

function toProfileCampaign(campaign: CampaignSummary): ProfileCampaign {
  return { id: campaign.id, name: campaign.name, isArchived: campaign.statut === 2 };
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

    const [currentAbsences, masteredCampaigns, playedCampaigns] = await Promise.all([
      this.absenceRepo.findCurrentByUser(userId),
      this.campaignRepo.findMasteredCampaigns(userId, true),
      this.campaignRepo.findPlayerCampaigns(userId, true),
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
      currentAbsences,
      masteredCampaigns: masteredCampaigns.filter(isVisibleOnProfile).map(toProfileCampaign),
      playedCampaigns: playedCampaigns.filter(isVisibleOnProfile).map(toProfileCampaign),
    };
  }
}

export const userQueries = new UserQueries();
