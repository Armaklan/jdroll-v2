import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface RemoveAssistantMjDTO {
  campaignId: number;
  mjId: number;
  targetUserId: number;
}

export interface RemoveAssistantMjResult {
  success: boolean;
  message: string;
}

/**
 * Rétrograde un MJ Assistant (retour au rôle de joueur).
 * Réservé au MJ propriétaire ou à l'assistant concerné lui-même.
 */
export class RemoveAssistantMjUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository
  ) {}

  async execute(dto: RemoveAssistantMjDTO): Promise<RemoveAssistantMjResult> {
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

    const isOwner = campaign.mjId === mjId;
    const isSelfDemotion = mjId === targetUserId;
    if (!isOwner && !isSelfDemotion) {
      throw new ForbiddenError("Seul le Maître du Jeu ou l'assistant concerné peut rétrograder un MJ Assistant");
    }

    await this.campaignRepo.removeCampaignAssistant?.(campaignId, targetUserId);

    return {
      success: true,
      message: "Le MJ Assistant a été rétrogradé avec succès.",
    };
  }
}

export const removeAssistantMjUseCase = new RemoveAssistantMjUseCase();
