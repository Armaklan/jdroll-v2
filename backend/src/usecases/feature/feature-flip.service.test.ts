import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureFlipService } from './feature-flip.service.js';
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

describe('FeatureFlipService', () => {
  let repo: InMemoryFeatureRepository;
  let service: FeatureFlipService;

  beforeEach(async () => {
    repo = new InMemoryFeatureRepository();
    await repo.seed([
      { id: 1, name: 'feedback-module', description: 'Module de feedback', enabled: true },
      { id: 2, name: 'advanced-search', description: 'Recherche avancée', enabled: false },
    ]);
    service = new FeatureFlipService(repo);
  });

  it('should return true for an enabled feature', async () => {
    assert.equal(await service.isEnabled('feedback-module'), true);
  });

  it('should return false for a disabled feature', async () => {
    assert.equal(await service.isEnabled('advanced-search'), false);
  });

  it('should return false for an unknown feature', async () => {
    assert.equal(await service.isEnabled('does-not-exist'), false);
  });

  it('should reflect a feature state change', async () => {
    await repo.setEnabled('advanced-search', true);

    assert.equal(await service.isEnabled('advanced-search'), true);
  });
});
