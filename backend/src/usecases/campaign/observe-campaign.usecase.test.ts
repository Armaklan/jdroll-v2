import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ObserveCampaignUseCase } from './observe-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('ObserveCampaignUseCase', () => {
  let useCase: ObserveCampaignUseCase;
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
    observedList = [];
    mockCampaignRepo = {
      findById: async (id: number) => (id === 10 ? mockCampaign : null),
      isUserCampaignParticipant: async (campaignId: number, userId: number) => {
        return campaignId === 10 && userId === 2; // user 2 is player
      },
      addCampaignObserver: async (campaignId: number, userId: number) => {
        if (!observedList.some((o) => o.campaignId === campaignId && o.userId === userId)) {
          observedList.push({ campaignId, userId });
        }
      },
    };
    useCase = new ObserveCampaignUseCase(mockCampaignRepo as ICampaignRepository);
  });

  it('should successfully observe a campaign for a non-MJ and non-player user', async () => {
    const result = await useCase.execute({ campaignId: 10, userId: 3 });

    assert.equal(result.success, true);
    assert.equal(result.isObserving, true);
    assert.equal(result.campaignId, 10);
    assert.deepEqual(observedList, [{ campaignId: 10, userId: 3 }]);
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 3 }),
      CampaignNotFoundError
    );
  });

  it('should throw ValidationError when user is MJ of the campaign', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 1 }),
      (err: any) => err instanceof ValidationError && err.message.includes('Maître du Jeu')
    );
  });

  it('should throw ValidationError when user is already a player in the campaign', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 2 }),
      (err: any) => err instanceof ValidationError && err.message.includes('joueur')
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
