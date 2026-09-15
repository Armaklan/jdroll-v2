import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SetCampaignAlertUseCase } from './set-campaign-alert.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('SetCampaignAlertUseCase', () => {
  let useCase: SetCampaignAlertUseCase;
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
    alertList = [];
    mockCampaignRepo = {
      findById: async (id: number) => (id === 10 ? mockCampaign : null),
      isUserCampaignParticipant: async (campaignId: number, userId: number) => {
        return campaignId === 10 && userId === 2; // user 2 is player
      },
      addCampaignAlert: async (campaignId: number, userId: number) => {
        if (!alertList.some((a) => a.campaignId === campaignId && a.userId === userId)) {
          alertList.push({ campaignId, userId });
        }
      },
    };
    useCase = new SetCampaignAlertUseCase(mockCampaignRepo as ICampaignRepository);
  });

  it('should successfully set alert for the MJ of the campaign', async () => {
    const result = await useCase.execute({ campaignId: 10, userId: 1 });

    assert.equal(result.success, true);
    assert.equal(result.hasAlert, true);
    assert.equal(result.campaignId, 10);
    assert.deepEqual(alertList, [{ campaignId: 10, userId: 1 }]);
  });

  it('should successfully set alert for a player in the campaign', async () => {
    const result = await useCase.execute({ campaignId: 10, userId: 2 });

    assert.equal(result.success, true);
    assert.equal(result.hasAlert, true);
    assert.equal(result.campaignId, 10);
    assert.deepEqual(alertList, [{ campaignId: 10, userId: 2 }]);
  });

  it('should throw ForbiddenError when user is neither MJ nor player', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 3 }),
      ForbiddenError
    );
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
