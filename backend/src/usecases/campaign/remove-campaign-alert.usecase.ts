import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';

export interface RemoveCampaignAlertDTO {
  campaignId: number;
  userId: number;
}

export interface RemoveCampaignAlertResult {
  success: boolean;
  message: string;
  campaignId: number;
  hasAlert: boolean;
}

export class RemoveCampaignAlertUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: RemoveCampaignAlertDTO): Promise<RemoveCampaignAlertResult> {
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

    await this.campaignRepo.removeCampaignAlert(campaignId, userId);

    return {
      success: true,
      message: `La campagne « ${campaign.name} » n'est plus marquée « À traiter »`,
      campaignId,
      hasAlert: false,
    };
  }
}

export const removeCampaignAlertUseCase = new RemoveCampaignAlertUseCase();
