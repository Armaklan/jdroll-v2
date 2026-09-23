import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  UserNotFoundError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface RejectParticipantDTO {
  campaignId: number;
  mjId: number;
  targetUserId: number;
}

export interface RejectParticipantResult {
  success: boolean;
  message: string;
}

export class RejectParticipantUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(dto: RejectParticipantDTO): Promise<RejectParticipantResult> {
    const campaignId = Number(dto.campaignId);
    const mjId = Number(dto.mjId);
    const targetUserId = Number(dto.targetUserId);

    if (isNaN(campaignId) || campaignId <= 0) {
      throw new ValidationError('Identifiant de campagne invalide');
    }
    if (isNaN(mjId) || mjId <= 0) {
      throw new ValidationError('Identifiant MJ invalide');
    }
    if (isNaN(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('Identifiant utilisateur cible invalide');
    }

    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne #${campaignId} est introuvable`);
    }

    if (campaign.mjId !== mjId) {
      throw new ForbiddenError("Seul le Maître du Jeu de cette campagne peut refuser les inscriptions");
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`L'utilisateur #${targetUserId} est introuvable`);
    }

    await this.campaignRepo.removeCampaignParticipant(campaignId, targetUserId);

    await this.eventBus.publish({
      name: 'ParticipantRejected',
      campaignId,
      campaignName: campaign.name,
      mjId,
      targetUserId,
      targetUsername: targetUser.username,
    });

    return {
      success: true,
      message: "L'inscription a été refusée",
    };
  }
}

export const rejectParticipantUseCase = new RejectParticipantUseCase();
