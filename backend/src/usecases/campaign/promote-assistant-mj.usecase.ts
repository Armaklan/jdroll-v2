import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { FeatureFlipService, featureFlipService } from '../feature/feature-flip.service.js';
import { ASSISTANT_MJ_FEATURE } from '../../services/campaign-permission.service.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface PromoteAssistantMjDTO {
  campaignId: number;
  mjId: number;
  targetUserId: number;
}

export interface PromoteAssistantMjResult {
  success: boolean;
  message: string;
}

/**
 * Promeut un participant de la campagne au rôle de MJ Assistant.
 * Réservé au MJ propriétaire, et actif uniquement lorsque le feature
 * flip `assistant-mj` est activé.
 */
export class PromoteAssistantMjUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly featureFlip: FeatureFlipService = featureFlipService
  ) {}

  async execute(dto: PromoteAssistantMjDTO): Promise<PromoteAssistantMjResult> {
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
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    if (campaign.mjId !== mjId) {
      throw new ForbiddenError("Seul le Maître du Jeu de cette campagne peut promouvoir un MJ Assistant");
    }

    if (!(await this.featureFlip.isEnabled(ASSISTANT_MJ_FEATURE))) {
      throw new ForbiddenError("La fonctionnalité MJ Assistant n'est pas activée sur cette instance");
    }

    if (targetUserId === campaign.mjId) {
      throw new ValidationError('Le Maître du Jeu ne peut pas se promouvoir lui-même en MJ Assistant');
    }

    const isParticipant = await this.campaignRepo.isUserCampaignParticipant(campaignId, targetUserId);
    if (!isParticipant) {
      throw new ValidationError("Seul un participant validé de la campagne peut être promu MJ Assistant");
    }

    await this.campaignRepo.addCampaignAssistant?.(campaignId, targetUserId);

    return {
      success: true,
      message: 'Le participant a été promu MJ Assistant avec succès.',
    };
  }
}

export const promoteAssistantMjUseCase = new PromoteAssistantMjUseCase();
