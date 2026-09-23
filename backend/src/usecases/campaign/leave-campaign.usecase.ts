import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
  UserNotFoundError,
} from '../../errors/domain.errors.js';

export interface LeaveCampaignDTO {
  campaignId: number;
  userId: number;
}

export interface LeaveCampaignResult {
  success: boolean;
  message: string;
  campaignId: number;
}

export class LeaveCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(dto: LeaveCampaignDTO): Promise<LeaveCampaignResult> {
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

    if (campaign.mjId === userId) {
      throw new ForbiddenError('Le Maître du Jeu ne peut pas quitter sa propre campagne');
    }

    const status = await this.campaignRepo.getCampaignParticipantStatus(campaignId, userId);
    if (status === null || status === undefined) {
      throw new ValidationError('Vous ne faites pas partie de cette campagne');
    }

    await this.campaignRepo.removeCampaignParticipant(campaignId, userId);

    // Get username for notification
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`L'utilisateur #${userId} est introuvable`);
    }

    await this.eventBus.publish({
      name: 'ParticipantLeft',
      campaignId,
      campaignName: campaign.name,
      targetUserId: userId,
      targetUsername: user.username,
    });

    return {
      success: true,
      message: `Vous avez quitté la campagne « ${campaign.name} » avec succès.`,
      campaignId,
    };
  }
}

export const leaveCampaignUseCase = new LeaveCampaignUseCase();
