import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface CreateSectionInput {
  campagneId?: number | null;
  userId: number;
  userProfil?: number;
  title: string;
  defaultCollapse?: boolean;
  banniere?: string;
}

export interface CreateSectionOutput {
  id: number;
  campagneId: number | null;
  title: string;
  ordre: number;
  defaultCollapse: boolean;
  banniere: string;
}

export class CreateSectionUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: CreateSectionInput): Promise<CreateSectionOutput> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new ValidationError('Le titre de la section ne peut pas être vide');
    }

    if (trimmedTitle.length > 500) {
      throw new ValidationError('Le titre de la section ne peut pas dépasser 500 caractères');
    }

    const campaignId = input.campagneId && input.campagneId > 0 ? input.campagneId : null;

    if (campaignId) {
      const campaign = await this.campaignRepo.findById(campaignId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
      }

      const isMj = await this.forumRepo.isUserCampaignMj(campaignId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut créer une section');
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut créer une section sur le forum général');
      }
    }

    const maxOrdre = await this.forumRepo.getMaxSectionOrdre(campaignId);
    const newOrdre = maxOrdre + 1;

    const sectionId = await this.forumRepo.createSection({
      campagneId: campaignId,
      title: trimmedTitle,
      ordre: newOrdre,
      defaultCollapse: input.defaultCollapse ?? false,
      banniere: input.banniere ?? '',
    });

    return {
      id: sectionId,
      campagneId: campaignId,
      title: trimmedTitle,
      ordre: newOrdre,
      defaultCollapse: input.defaultCollapse ?? false,
      banniere: input.banniere ?? '',
    };
  }
}

export const createSectionUseCase = new CreateSectionUseCase();
