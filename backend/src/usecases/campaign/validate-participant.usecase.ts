import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  UserNotFoundError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface ValidateParticipantDTO {
  campaignId: number;
  mjId: number;
  targetUserId: number;
}

export interface ValidateParticipantResult {
  success: boolean;
  message: string;
}

export class ValidateParticipantUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(dto: ValidateParticipantDTO): Promise<ValidateParticipantResult> {
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
      throw new ForbiddenError("Seul le Maître du Jeu de cette campagne peut valider les inscriptions");
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new UserNotFoundError(`L'utilisateur #${targetUserId} est introuvable`);
    }

    await this.campaignRepo.validateCampaignParticipant(campaignId, targetUserId);

    await this.campaignRepo.createCharacter({
      campagneId: campaignId,
      userId: targetUserId,
      name: targetUser.username,
      concept: '',
      avatar: targetUser.avatar || '',
      publicDescription: '',
      privateDescription: '',
      technical: '',
      statut: 0,
      catId: null,
      persoFields: null,
      widgets: '',
    });

    return {
      success: true,
      message: `L'inscription de ${targetUser.username} a été validée avec succès et un personnage lui a été assigné.`,
    };
  }
}

export const validateParticipantUseCase = new ValidateParticipantUseCase();
