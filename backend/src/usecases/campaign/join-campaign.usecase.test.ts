import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JoinCampaignUseCase } from './join-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { IEventBus } from '../../events/event-bus.js';
import { CampaignNotFoundError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary, User } from '../../types/index.js';

const mockUser: User = {
  id: 2,
  username: 'Player_Two',
  mail: 'player2@example.com',
  avatar: '',
  description: '',
  profil: 0,
  titre: '',
  subscribe_date: '2026-01-01',
};

const mockUserRepo: IUserRepository = {
  async findById(id: number): Promise<User | null> {
    return id === mockUser.id ? mockUser : null;
  },
  async findByUsernameOrEmail(): Promise<any | null> {
    return null;
  },
  async findByUsernames(): Promise<User[]> {
    return [];
  },
  async searchByUsername(): Promise<{ id: number; username: string; avatar: string }[]> {
    return [];
  },
  async existsByUsernameOrEmail(): Promise<boolean> {
    return false;
  },
  async create(): Promise<User> {
    return mockUser;
  },
  async updateProfile(): Promise<User> {
    return mockUser;
  },
  async updateNotificationSettings(): Promise<User> {
    return mockUser;
  },
  async updatePassword(): Promise<void> {},
  async findLatestRegistrations(): Promise<any[]> {
    return [];
  },
  async findTodayBirthdays(): Promise<any[]> {
    return [];
  },
};

const publishedEvents: any[] = [];

const mockEventBus: IEventBus = {
  async publish(event: any): Promise<void> {
    publishedEvents.push(event);
  },
  subscribe(): void {},
  unsubscribe(): void {},
  clearHandlers(): void {},
};

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

describe('JoinCampaignUseCase', () => {
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
    nbJoueursActuel: 1,
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  it('lève une CampaignNotFoundError si la campagne n’existe pas', async () => {
    const { repo } = createMockCampaignRepo([]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 2 }),
      CampaignNotFoundError
    );
  });

  it('lève une ValidationError si la campagne est archivée', async () => {
    const { repo } = createMockCampaignRepo([
      { ...sampleCampaign, id: 11, statut: 2, isArchived: true },
    ]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    await assert.rejects(
      () => useCase.execute({ campaignId: 11, userId: 2 }),
      ValidationError
    );
  });

  it('lève une ValidationError si la campagne est en préparation', async () => {
    const { repo } = createMockCampaignRepo([
      { ...sampleCampaign, id: 13, statut: 3 },
    ]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    await assert.rejects(
      () => useCase.execute({ campaignId: 13, userId: 2 }),
      ValidationError
    );
  });

  it('lève une ValidationError si le recrutement est fermé', async () => {
    const { repo } = createMockCampaignRepo([
      { ...sampleCampaign, id: 12, isRecrutementOpen: false },
    ]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    await assert.rejects(
      () => useCase.execute({ campaignId: 12, userId: 2 }),
      ValidationError
    );
  });

  it('lève une ValidationError si l’utilisateur est le MJ de la campagne', async () => {
    const { repo } = createMockCampaignRepo([sampleCampaign]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 1 }), // userId 1 is MJ
      ValidationError
    );
  });

  it('permet à un joueur de rejoindre avec succès la campagne', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    const result = await useCase.execute({ campaignId: 10, userId: 2 });

    assert.equal(result.success, true);
    assert.equal(result.campaignId, 10);
    assert.equal(participants.get('10-2'), 0);
  });

  it('retourne un message informatif si le joueur participe déjà', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-2', 1);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    const result = await useCase.execute({ campaignId: 10, userId: 2 });

    assert.equal(result.success, true);
    assert.match(result.message, /déjà/);
  });

  it('retourne un message informatif si la demande du joueur est déjà en attente', async () => {
    const { repo, participants } = createMockCampaignRepo([sampleCampaign]);
    participants.set('10-2', 0);
    const useCase = new JoinCampaignUseCase(repo, mockUserRepo, mockEventBus);

    const result = await useCase.execute({ campaignId: 10, userId: 2 });

    assert.equal(result.success, true);
    assert.match(result.message, /attente/);
  });
});
