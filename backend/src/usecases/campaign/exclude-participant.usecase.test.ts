import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExcludeParticipantUseCase } from './exclude-participant.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

function createMockCampaignRepo(initialCampaigns: CampaignSummary[] = []) {
  const campaigns = [...initialCampaigns];
  const participants = new Map<string, number>();

  const repo: ICampaignRepository = {
    async findMasteredCampaigns(userId: number): Promise<CampaignSummary[]> {
      return campaigns.filter((c) => c.mjId === userId);
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
      const c = campaigns.find((item) => item.id === campaignId);
      if (c && statut === 1) {
        c.nbJoueursActuel += 1;
      }
    },
    async validateCampaignParticipant(campaignId: number, userId: number): Promise<void> {
      participants.set(`${campaignId}-${userId}`, 1);
    },
    async removeCampaignParticipant(campaignId: number, userId: number): Promise<void> {
      participants.delete(`${campaignId}-${userId}`);
      const c = campaigns.find((item) => item.id === campaignId);
      if (c) {
        c.nbJoueursActuel = Math.max(0, c.nbJoueursActuel - 1);
      }
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

  return { repo, campaigns, participants };
}

describe('ExcludeParticipantUseCase', () => {
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
    nbJoueursActuel: 2,
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  it('lève une CampaignNotFoundError si la campagne n’existe pas', async () => {
    const { repo } = createMockCampaignRepo([]);
    const useCase = new ExcludeParticipantUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 999, mjId: 1, targetUserId: 2 }),
      CampaignNotFoundError
    );
  });

  it('lève une ForbiddenError si l’utilisateur n’est pas le MJ de la campagne', async () => {
    const { repo } = createMockCampaignRepo([sampleCampaign]);
    const useCase = new ExcludeParticipantUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 99, targetUserId: 2 }), // mjId 99 is not the MJ
      ForbiddenError
    );
  });

  it('lève une ValidationError si l’utilisateur cible n’est pas un participant', async () => {
    const { repo } = createMockCampaignRepo([sampleCampaign]);
    const useCase = new ExcludeParticipantUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 99 }), // userId 99 is not a participant
      ValidationError
    );
  });

  it('lève une ForbiddenError si le MJ tente d’exclure lui-même', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-1', 1); // MJ is also a participant (shouldn't happen but test it)
    const useCase = new ExcludeParticipantUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 1 }), // trying to exclude self
      ForbiddenError
    );
  });

  it('permet au MJ d’exclure avec succès un joueur validé de la campagne', async () => {
    const { repo, participants, campaigns } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-2', 1); // user 2 is a valid participant
    const initialCount = campaigns[0].nbJoueursActuel;
    
    const useCase = new ExcludeParticipantUseCase(repo);
    const result = await useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 });

    assert.equal(result.success, true);
    assert.equal(campaigns[0].nbJoueursActuel, initialCount - 1);
    assert.equal(participants.get('10-2'), undefined);
  });

  it('permet au MJ d’exclure un joueur en attente de validation', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-2', 0); // user 2 is pending
    
    const useCase = new ExcludeParticipantUseCase(repo);
    const result = await useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 });

    assert.equal(result.success, true);
    assert.equal(participants.get('10-2'), undefined);
  });

  it('retourne un message de succès approprié', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-2', 1);
    
    const useCase = new ExcludeParticipantUseCase(repo);
    const result = await useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 });

    assert.match(result.message, /exclu|Exclu/);
  });
});
