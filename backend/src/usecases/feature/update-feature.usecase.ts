import { IFeatureRepository, featureRepository } from '../../repositories/feature.repository.js';
import { FeatureFlip } from '../../types/index.js';
import { ADMIN_PROFILE } from '../user/assign-user-title.usecase.js';
import { FeatureNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';

export interface UpdateFeatureInput {
  requesterProfil: number;
  name: string;
  enabled: boolean;
}

/**
 * Active ou désactive un feature flip.
 * Réservé aux administrateurs (profil 2).
 */
export class UpdateFeatureUseCase {
  constructor(private readonly featureRepo: IFeatureRepository = featureRepository) {}

  async execute(input: UpdateFeatureInput): Promise<FeatureFlip> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut modifier un feature flip');
    }

    const feature = await this.featureRepo.findByName(input.name);
    if (!feature) {
      throw new FeatureNotFoundError(`Feature ${input.name} introuvable`);
    }

    await this.featureRepo.setEnabled(input.name, input.enabled);
    return { ...feature, enabled: input.enabled };
  }
}

export const updateFeatureUseCase = new UpdateFeatureUseCase();
