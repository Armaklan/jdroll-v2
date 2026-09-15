import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';

export interface UnobserveCampaignDTO {
  campaignId: number;
  userId: number;
}

export interface UnobserveCampaignResult {
  success: boolean;
  message: string;
  campaignId: number;
  isObserving: boolean;
}

export class UnobserveCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: UnobserveCampaignDTO): Promise<UnobserveCampaignResult> {
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

    await this.campaignRepo.removeCampaignObserver(campaignId, userId);

    return {
      success: true,
      message: `Vous n'observez plus la campagne « ${campaign.name} »`,
      campaignId,
      isObserving: false,
    };
  }
}

export const unobserveCampaignUseCase = new UnobserveCampaignUseCase();
