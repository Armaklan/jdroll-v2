import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
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
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

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

    await this.campaignRepo.removeCampaignParticipant(campaignId, targetUserId);

    return {
      success: true,
      message: "L'inscription a été refusée",
    };
  }
}

export const rejectParticipantUseCase = new RejectParticipantUseCase();
