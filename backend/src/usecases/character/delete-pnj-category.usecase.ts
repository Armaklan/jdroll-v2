import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CategoryNotFoundError,
  CampaignNotFoundError,
  ForbiddenError,
} from '../../errors/domain.errors.js';

export interface DeletePnjCategoryInput {
  categoryId: number;
  userId: number; // Current logged-in user
}

export interface DeletePnjCategoryOutput {
  success: boolean;
  categoryId: number;
}

export class DeletePnjCategoryUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(input: DeletePnjCategoryInput): Promise<DeletePnjCategoryOutput> {
    const category = await this.campaignRepo.findPnjCategoryById(input.categoryId);
    if (!category) {
      throw new CategoryNotFoundError(`La catégorie avec l'identifiant ${input.categoryId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(category.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne associée n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut supprimer une catégorie');
    }

    await this.campaignRepo.deletePnjCategory(input.categoryId);

    return {
      success: true,
      categoryId: input.categoryId,
    };
  }
}

export const deletePnjCategoryUseCase = new DeletePnjCategoryUseCase();
