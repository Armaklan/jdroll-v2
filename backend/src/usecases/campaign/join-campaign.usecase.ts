import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';

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
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

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

    const isAlreadyParticipant = await this.campaignRepo.isUserCampaignParticipant(campaignId, userId);
    if (isAlreadyParticipant) {
      return {
        success: true,
        message: 'Vous participez déjà à cette campagne',
        campaignId,
      };
    }

    await this.campaignRepo.addCampaignParticipant(campaignId, userId);

    return {
      success: true,
      message: `Félicitations, vous avez rejoint la campagne « ${campaign.name} » !`,
      campaignId,
    };
  }
}

export const joinCampaignUseCase = new JoinCampaignUseCase();
