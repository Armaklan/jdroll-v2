import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ListFeaturesUseCase } from './list-features.usecase.js';
import { IFeatureRepository } from '../../repositories/feature.repository.js';
import { FeatureFlip } from '../../types/index.js';

class InMemoryFeatureRepository implements IFeatureRepository {
  private features: FeatureFlip[] = [];

  async seed(features: FeatureFlip[]) {
    this.features = features;
  }

  async findAll(): Promise<FeatureFlip[]> {
    return this.features;
  }

  async findByName(name: string): Promise<FeatureFlip | null> {
    return this.features.find((f) => f.name === name) || null;
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const feature = this.features.find((f) => f.name === name);
    if (!feature) {
      throw new Error(`Feature ${name} introuvable`);
    }
    feature.enabled = enabled;
  }
}

describe('ListFeaturesUseCase', () => {
  let repo: InMemoryFeatureRepository;
  let useCase: ListFeaturesUseCase;

  beforeEach(() => {
    repo = new InMemoryFeatureRepository();
    useCase = new ListFeaturesUseCase(repo);
  });

  it('should return all feature flips', async () => {
    await repo.seed([
      { id: 1, name: 'feedback-module', description: 'Module de feedback', enabled: false },
      { id: 2, name: 'advanced-search', description: 'Recherche avancée', enabled: true },
    ]);

    const features = await useCase.execute();

    assert.equal(features.length, 2);
    assert.equal(features[0].name, 'feedback-module');
    assert.equal(features[0].enabled, false);
    assert.equal(features[1].name, 'advanced-search');
    assert.equal(features[1].enabled, true);
  });

  it('should return an empty list when no feature exists', async () => {
    const features = await useCase.execute();

    assert.deepEqual(features, []);
  });
});
