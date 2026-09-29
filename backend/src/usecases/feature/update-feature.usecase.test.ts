import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateFeatureUseCase } from './update-feature.usecase.js';
import { IFeatureRepository } from '../../repositories/feature.repository.js';
import { FeatureFlip } from '../../types/index.js';
import { ForbiddenError, FeatureNotFoundError } from '../../errors/domain.errors.js';

const ADMIN_PROFILE = 2;

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

describe('UpdateFeatureUseCase', () => {
  let repo: InMemoryFeatureRepository;
  let useCase: UpdateFeatureUseCase;

  beforeEach(async () => {
    repo = new InMemoryFeatureRepository();
    await repo.seed([
      { id: 1, name: 'feedback-module', description: 'Module de feedback', enabled: false },
    ]);
    useCase = new UpdateFeatureUseCase(repo);
  });

  it('should allow an administrator to enable a feature', async () => {
    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      name: 'feedback-module',
      enabled: true,
    });

    assert.equal(result.name, 'feedback-module');
    assert.equal(result.enabled, true);
  });

  it('should allow an administrator to disable a feature', async () => {
    await repo.seed([
      { id: 1, name: 'feedback-module', description: 'Module de feedback', enabled: true },
    ]);

    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      name: 'feedback-module',
      enabled: false,
    });

    assert.equal(result.enabled, false);
  });

  it('should reject a non-administrator', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: 0,
        name: 'feedback-module',
        enabled: true,
      }),
      ForbiddenError
    );

    const feature = await repo.findByName('feedback-module');
    assert.equal(feature?.enabled, false);
  });

  it('should reject an unknown feature', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        name: 'unknown-feature',
        enabled: true,
      }),
      FeatureNotFoundError
    );
  });
});
