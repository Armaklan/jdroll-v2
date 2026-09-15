import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';

export interface ObserveCampaignDTO {
  campaignId: number;
  userId: number;
}

export interface ObserveCampaignResult {
  success: boolean;
  message: string;
  campaignId: number;
  isObserving: boolean;
}

export class ObserveCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: ObserveCampaignDTO): Promise<ObserveCampaignResult> {
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
      throw new ValidationError('Vous êtes le Maître du Jeu de cette campagne');
    }

    const isParticipant = await this.campaignRepo.isUserCampaignParticipant(campaignId, userId);
    if (isParticipant) {
      throw new ValidationError('Vous participez déjà en tant que joueur à cette campagne');
    }

    await this.campaignRepo.addCampaignObserver(campaignId, userId);

    return {
      success: true,
      message: `Vous observez désormais la campagne « ${campaign.name} »`,
      campaignId,
      isObserving: true,
    };
  }
}

export const observeCampaignUseCase = new ObserveCampaignUseCase();
