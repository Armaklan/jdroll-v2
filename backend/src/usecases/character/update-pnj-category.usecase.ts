import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CategoryNotFoundError,
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdatePnjCategoryInput {
  categoryId: number;
  userId: number; // Current logged-in user
  name?: string;
  defaultCollapse?: boolean;
}

export interface UpdatePnjCategoryOutput {
  id: number;
  campagneId: number;
  name: string;
  defaultCollapse: boolean;
}

export class UpdatePnjCategoryUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(input: UpdatePnjCategoryInput): Promise<UpdatePnjCategoryOutput> {
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
      throw new ForbiddenError('Seul le Maître du Jeu peut modifier une catégorie');
    }

    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new ValidationError('Le nom de la catégorie ne peut pas être vide');
      }
      if (trimmedName.length > 200) {
        throw new ValidationError('Le nom de la catégorie ne peut pas dépasser 200 caractères');
      }
    }

    await this.campaignRepo.updatePnjCategory(input.categoryId, {
      name: trimmedName,
      defaultCollapse: input.defaultCollapse !== undefined ? (input.defaultCollapse ? 1 : 0) : undefined,
    });

    return {
      id: category.id,
      campagneId: category.campagneId,
      name: trimmedName !== undefined ? trimmedName : category.name,
      defaultCollapse: input.defaultCollapse !== undefined ? input.defaultCollapse : Boolean(category.defaultCollapse),
    };
  }
}

export const updatePnjCategoryUseCase = new UpdatePnjCategoryUseCase();
