import { ICarteRepository, carteRepository } from '../../repositories/carte.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { CarteConfig } from '../../types/index.js';

export interface CreateCarteInput {
  campaignId: number;
  userId: number;
  name: string;
  description?: string;
  image: string;
  published?: boolean;
  config?: CarteConfig | string;
}

export class CreateCarteUseCase {
  constructor(
    private readonly carteRepo: ICarteRepository = carteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository
  ) {}

  async execute(input: CreateCarteInput): Promise<{ id: number }> {
    if (!input.name || input.name.trim() === '') {
      throw new ValidationError('Le nom de la carte est requis');
    }
    if (!input.image || input.image.trim() === '') {
      throw new ValidationError("L'image de la carte est requise");
    }

    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campaignId} n'existe pas`);
    }

    if (campaign.mjId !== input.userId) {
      throw new ForbiddenError('Seul le MJ peut créer une carte');
    }

    let configStr = '{"markers":[],"tabReduce":false}';
    if (input.config) {
      if (typeof input.config === 'string') {
        configStr = input.config;
      } else {
        configStr = JSON.stringify(input.config);
      }
    }

    const id = await this.carteRepo.createCarte({
      campagneId: input.campaignId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      image: input.image.trim(),
      published: input.published ?? true,
      config: configStr,
    });

    return { id };
  }
}

export const createCarteUseCase = new CreateCarteUseCase();
