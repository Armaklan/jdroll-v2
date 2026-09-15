import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';

export interface SetCampaignAlertDTO {
  campaignId: number;
  userId: number;
}

export interface SetCampaignAlertResult {
  success: boolean;
  message: string;
  campaignId: number;
  hasAlert: boolean;
}

export class SetCampaignAlertUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: SetCampaignAlertDTO): Promise<SetCampaignAlertResult> {
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

    const isMj = campaign.mjId === userId;
    const isParticipant = isMj ? true : await this.campaignRepo.isUserCampaignParticipant(campaignId, userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError('Vous devez être joueur ou Maître du Jeu de cette campagne pour la marquer « À traiter »');
    }

    await this.campaignRepo.addCampaignAlert(campaignId, userId);

    return {
      success: true,
      message: `La campagne « ${campaign.name} » est désormais marquée « À traiter »`,
      campaignId,
      hasAlert: true,
    };
  }
}

export const setCampaignAlertUseCase = new SetCampaignAlertUseCase();
