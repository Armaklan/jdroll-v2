import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface CreateSectionInput {
  campagneId: number;
  userId: number;
  title: string;
  defaultCollapse?: boolean;
  banniere?: string;
}

export interface CreateSectionOutput {
  id: number;
  campagneId: number;
  title: string;
  ordre: number;
  defaultCollapse: boolean;
  banniere: string;
}

export class CreateSectionUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(input: CreateSectionInput): Promise<CreateSectionOutput> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new ValidationError('Le titre de la section ne peut pas être vide');
    }

    if (trimmedTitle.length > 500) {
      throw new ValidationError('Le titre de la section ne peut pas dépasser 500 caractères');
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    const isMj = await this.forumRepo.isUserCampaignMj(input.campagneId, input.userId);
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut créer une section');
    }

    const maxOrdre = await this.forumRepo.getMaxSectionOrdre(input.campagneId);
    const newOrdre = maxOrdre + 1;

    const sectionId = await this.forumRepo.createSection({
      campagneId: input.campagneId,
      title: trimmedTitle,
      ordre: newOrdre,
      defaultCollapse: input.defaultCollapse ?? false,
      banniere: input.banniere ?? '',
    });

    return {
      id: sectionId,
      campagneId: input.campagneId,
      title: trimmedTitle,
      ordre: newOrdre,
      defaultCollapse: input.defaultCollapse ?? false,
      banniere: input.banniere ?? '',
    };
  }
}

export const createSectionUseCase = new CreateSectionUseCase();
