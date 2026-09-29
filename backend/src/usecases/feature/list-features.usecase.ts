import { IFeatureRepository, featureRepository } from '../../repositories/feature.repository.js';
import { FeatureFlip } from '../../types/index.js';

/**
 * Liste l'ensemble des feature flips disponibles (authentifié).
 */
export class ListFeaturesUseCase {
  constructor(private readonly featureRepo: IFeatureRepository = featureRepository) {}

  async execute(): Promise<FeatureFlip[]> {
    return this.featureRepo.findAll();
  }
}

export const listFeaturesUseCase = new ListFeaturesUseCase();
