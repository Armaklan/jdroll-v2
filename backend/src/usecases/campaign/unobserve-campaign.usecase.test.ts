import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UnobserveCampaignUseCase } from './unobserve-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('UnobserveCampaignUseCase', () => {
  let useCase: UnobserveCampaignUseCase;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let observedList: Array<{ campaignId: number; userId: number }>;

  const mockCampaign: CampaignSummary = {
    id: 10,
    name: 'La quête du Graal',
    mjId: 1,
    mjUsername: 'Gandalf',
    mjAvatar: '',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    banniereForum: null,
    systeme: 'D&D',
    univers: 'Médiéval',
    description: 'Une grande quête',
    statut: 1,
    isArchived: false,
    isRecrutementOpen: true,
  };

  beforeEach(() => {
    observedList = [{ campaignId: 10, userId: 3 }];
    mockCampaignRepo = {
      findById: async (id: number) => (id === 10 ? mockCampaign : null),
      removeCampaignObserver: async (campaignId: number, userId: number) => {
        observedList = observedList.filter(
          (o) => !(o.campaignId === campaignId && o.userId === userId)
        );
      },
    };
    useCase = new UnobserveCampaignUseCase(mockCampaignRepo as ICampaignRepository);
  });

  it('should successfully remove an observer from a campaign', async () => {
    const result = await useCase.execute({ campaignId: 10, userId: 3 });

    assert.equal(result.success, true);
    assert.equal(result.isObserving, false);
    assert.equal(result.campaignId, 10);
    assert.deepEqual(observedList, []);
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 3 }),
      CampaignNotFoundError
    );
  });

  it('should throw ValidationError for invalid IDs', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 0, userId: 3 }),
      ValidationError
    );
    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 0 }),
      ValidationError
    );
  });
});
