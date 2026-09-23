import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface ExcludeParticipantDTO {
  campaignId: number;
  mjId: number;
  targetUserId: number;
}

export interface ExcludeParticipantResult {
  success: boolean;
  message: string;
}

export class ExcludeParticipantUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: ExcludeParticipantDTO): Promise<ExcludeParticipantResult> {
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
      throw new ForbiddenError("Seul le Maître du Jeu de cette campagne peut exclure des participants");
    }

    if (mjId === targetUserId) {
      throw new ForbiddenError("Le Maître du Jeu ne peut pas s'exclure lui-même de sa campagne");
    }

    const status = await this.campaignRepo.getCampaignParticipantStatus(campaignId, targetUserId);
    if (status === null || status === undefined) {
      throw new ValidationError('L\'utilisateur cible ne fait pas partie de cette campagne');
    }

    await this.campaignRepo.removeCampaignParticipant(campaignId, targetUserId);

    return {
      success: true,
      message: "Le participant a été exclu de la campagne avec succès.",
    };
  }
}

export const excludeParticipantUseCase = new ExcludeParticipantUseCase();
