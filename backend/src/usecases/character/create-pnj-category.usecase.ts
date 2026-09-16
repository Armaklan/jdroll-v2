import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface CreatePnjCategoryInput {
  campagneId: number;
  userId: number; // Current logged-in user
  name: string;
  defaultCollapse?: boolean;
}

export interface CreatePnjCategoryOutput {
  id: number;
  campagneId: number;
  name: string;
  defaultCollapse: boolean;
}

export class CreatePnjCategoryUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(input: CreatePnjCategoryInput): Promise<CreatePnjCategoryOutput> {
    const trimmedName = input.name ? input.name.trim() : '';
    if (!trimmedName) {
      throw new ValidationError('Le nom de la catégorie ne peut pas être vide');
    }

    if (trimmedName.length > 200) {
      throw new ValidationError('Le nom de la catégorie ne peut pas dépasser 200 caractères');
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut créer une catégorie');
    }

    const categoryId = await this.campaignRepo.createPnjCategory({
      campagneId: input.campagneId,
      name: trimmedName,
      defaultCollapse: input.defaultCollapse ? 1 : 0,
    });

    return {
      id: categoryId,
      campagneId: input.campagneId,
      name: trimmedName,
      defaultCollapse: Boolean(input.defaultCollapse),
    };
  }
}

export const createPnjCategoryUseCase = new CreatePnjCategoryUseCase();
