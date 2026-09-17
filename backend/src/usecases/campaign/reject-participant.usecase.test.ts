import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RejectParticipantUseCase } from './reject-participant.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

function createMockRepo(initialCampaigns: CampaignSummary[] = []) {
  const campaigns = [...initialCampaigns];
  const participants = new Map<string, number>();

  const campaignRepo: ICampaignRepository = {
    async findMasteredCampaigns(): Promise<CampaignSummary[]> {
      return [];
    },
    async findPlayerCampaigns(): Promise<CampaignSummary[]> {
      return [];
    },
    async findAllCampaigns(): Promise<CampaignSummary[]> {
      return campaigns;
    },
    async findById(id: number): Promise<CampaignSummary | null> {
      return campaigns.find((c) => c.id === id) || null;
    },
    async createCampaign(): Promise<number> {
      return 1;
    },
    async updateCampaign(): Promise<void> {},
    async findCampaignCharacters(): Promise<any[]> {
      return [];
    },
    async findCampaignPnjCategories(): Promise<any[]> {
      return [];
    },
    async findCharacterById(): Promise<any | null> {
      return null;
    },
    async createCharacter(): Promise<number> {
      return 1;
    },
    async updateCharacter(): Promise<void> {},
    async deleteCharacter(): Promise<void> {},
    async updateCampaignBanner(): Promise<void> {},
    async findCampaignParticipants(): Promise<any[]> {
      return [];
    },
    async findPendingCampaignParticipants(): Promise<any[]> {
      return [];
    },
    async isUserCampaignParticipant(campaignId: number, userId: number): Promise<boolean> {
      return participants.get(`${campaignId}-${userId}`) === 1;
    },
    async getCampaignParticipantStatus(campaignId: number, userId: number): Promise<number | null> {
      const val = participants.get(`${campaignId}-${userId}`);
      return val !== undefined ? val : null;
    },
    async isUserCampaignPending(campaignId: number, userId: number): Promise<boolean> {
      return participants.get(`${campaignId}-${userId}`) === 0;
    },
    async addCampaignParticipant(campaignId: number, userId: number, statut: number = 0): Promise<void> {
      participants.set(`${campaignId}-${userId}`, statut);
    },
    async validateCampaignParticipant(campaignId: number, userId: number): Promise<void> {
      participants.set(`${campaignId}-${userId}`, 1);
    },
    async removeCampaignParticipant(campaignId: number, userId: number): Promise<void> {
      participants.delete(`${campaignId}-${userId}`);
    },
    async findObservedCampaigns(): Promise<CampaignSummary[]> {
      return [];
    },
    async isUserCampaignObserver(): Promise<boolean> {
      return false;
    },
    async addCampaignObserver(): Promise<void> {},
    async removeCampaignObserver(): Promise<void> {},
    async findCampaignObservers(): Promise<any[]> {
      return [];
    },
    async isUserCampaignAlert(): Promise<boolean> {
      return false;
    },
    async addCampaignAlert(): Promise<void> {},
    async removeCampaignAlert(): Promise<void> {},
  };

  return { campaignRepo, campaigns, participants };
}

describe('RejectParticipantUseCase', () => {
  const sampleCampaign: CampaignSummary = {
    id: 10,
    mjId: 1,
    mjUsername: 'GM_User',
    name: 'Campagne de Test',
    banniere: '',
    systeme: 'D&D 5E',
    univers: 'Fantasy',
    description: 'Une aventure épique',
    nbJoueurs: 4,
    nbJoueursActuel: 0,
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  it('supprime le participant en attente lors du refus', async () => {
    const { campaignRepo, participants } = createMockRepo([sampleCampaign]);
    participants.set('10-2', 0); // en attente

    const useCase = new RejectParticipantUseCase(campaignRepo);
    const result = await useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 });

    assert.equal(result.success, true);
    assert.equal(participants.has('10-2'), false);
  });

  it('lève une ForbiddenError si l’utilisateur appelant n’est pas le MJ', async () => {
    const { campaignRepo } = createMockRepo([sampleCampaign]);
    const useCase = new RejectParticipantUseCase(campaignRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 99, targetUserId: 2 }),
      ForbiddenError
    );
  });

  it('lève une CampaignNotFoundError si la campagne n’existe pas', async () => {
    const { campaignRepo } = createMockRepo([]);
    const useCase = new RejectParticipantUseCase(campaignRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 }),
      CampaignNotFoundError
    );
  });
});
