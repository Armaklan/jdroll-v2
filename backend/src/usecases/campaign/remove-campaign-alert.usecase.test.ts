import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RemoveCampaignAlertUseCase } from './remove-campaign-alert.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('RemoveCampaignAlertUseCase', () => {
  let useCase: RemoveCampaignAlertUseCase;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let alertList: Array<{ campaignId: number; userId: number }>;

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
    alertList = [{ campaignId: 10, userId: 1 }];
    mockCampaignRepo = {
      findById: async (id: number) => (id === 10 ? mockCampaign : null),
      removeCampaignAlert: async (campaignId: number, userId: number) => {
        alertList = alertList.filter(
          (a) => !(a.campaignId === campaignId && a.userId === userId)
        );
      },
    };
    useCase = new RemoveCampaignAlertUseCase(mockCampaignRepo as ICampaignRepository);
  });

  it('should successfully remove alert for a campaign', async () => {
    const result = await useCase.execute({ campaignId: 10, userId: 1 });

    assert.equal(result.success, true);
    assert.equal(result.hasAlert, false);
    assert.equal(result.campaignId, 10);
    assert.deepEqual(alertList, []);
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 1 }),
      CampaignNotFoundError
    );
  });

  it('should throw ValidationError for invalid IDs', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 0, userId: 1 }),
      ValidationError
    );
    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 0 }),
      ValidationError
    );
  });
});
