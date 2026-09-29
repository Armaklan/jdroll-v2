import { IFeatureRepository, featureRepository } from '../../repositories/feature.repository.js';

/**
 * Service de feature flipping côté backend.
 * Permet de conditionner du code serveur à l'activation d'une feature :
 *   if (await featureFlipService.isEnabled('ma-feature')) { ... }
 * Une feature inconnue de la base est considérée comme désactivée.
 */
export class FeatureFlipService {
  constructor(private readonly featureRepo: IFeatureRepository = featureRepository) {}

  async isEnabled(name: string): Promise<boolean> {
    const feature = await this.featureRepo.findByName(name);
    return Boolean(feature?.enabled);
  }
}

export const featureFlipService = new FeatureFlipService();
