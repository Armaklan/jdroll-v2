import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ValidationError,
  UserNotFoundError,
} from '../../errors/domain.errors.js';

export interface JoinCampaignDTO {
  campaignId: number;
  userId: number;
}

export interface JoinCampaignResult {
  success: boolean;
  message: string;
  campaignId: number;
}

export class JoinCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(dto: JoinCampaignDTO): Promise<JoinCampaignResult> {
    const campaignId = Number(dto.campaignId);
    const userId = Number(dto.userId);

    if (isNaN(campaignId) || campaignId <= 0) {
      throw new ValidationError('Identifiant de campagne invalide');
    }

    if (isNaN(userId) || userId <= 0) {
      throw new ValidationError('Identifiant utilisateur invalide');
    }

    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne #${campaignId} est introuvable`);
    }

    if (campaign.isArchived || campaign.statut === 2) {
      throw new ValidationError('Impossible de rejoindre une campagne archivée');
    }

    if (campaign.statut === 3) {
      throw new ValidationError('Impossible de rejoindre une campagne en préparation');
    }

    if (!campaign.isRecrutementOpen) {
      throw new ValidationError('Le recrutement pour cette campagne est actuellement fermé');
    }

    if (campaign.mjId === userId) {
      throw new ValidationError('Vous êtes le Maître du Jeu de cette campagne');
    }

    const status = await this.campaignRepo.getCampaignParticipantStatus(campaignId, userId);
    if (status === 1) {
      return {
        success: true,
        message: 'Vous participez déjà à cette campagne',
        campaignId,
      };
    }

    if (status === 0) {
      return {
        success: true,
        message: "Votre demande d'inscription est déjà en attente de validation par le MJ",
        campaignId,
      };
    }

    await this.campaignRepo.addCampaignParticipant(campaignId, userId, 0);

    // Get username for notification
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`L'utilisateur #${userId} est introuvable`);
    }

    await this.eventBus.publish({
      name: 'ParticipantJoined',
      campaignId,
      campaignName: campaign.name,
      targetUserId: userId,
      targetUsername: user.username,
    });

    return {
      success: true,
      message: `Votre demande d'inscription à la campagne « ${campaign.name} » a bien été enregistrée et est en attente de validation par le MJ.`,
      campaignId,
    };
  }
}

export const joinCampaignUseCase = new JoinCampaignUseCase();
