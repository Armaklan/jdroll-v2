import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValidateParticipantUseCase } from './validate-participant.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { CampaignNotFoundError, ForbiddenError, UserNotFoundError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary, User } from '../../types/index.js';

function createMockRepos(initialCampaigns: CampaignSummary[] = [], initialUsers: User[] = []) {
  const campaigns = [...initialCampaigns];
  const users = [...initialUsers];
  const participants = new Map<string, number>();
  const createdCharacters: any[] = [];

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
    async createCharacter(data: any): Promise<number> {
      createdCharacters.push(data);
      return createdCharacters.length;
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
      const c = campaigns.find((item) => item.id === campaignId);
      if (c) {
        c.nbJoueursActuel += 1;
      }
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

  const userRepo: IUserRepository = {
    async findById(id: number): Promise<User | null> {
      return users.find((u) => u.id === id) || null;
    },
    async findByUsername(): Promise<any | null> {
      return null;
    },
    async findByMail(): Promise<any | null> {
      return null;
    },
    async create(): Promise<number> {
      return 1;
    },
    async updatePassword(): Promise<void> {},
    async updateProfil(): Promise<void> {},
    async updateDescription(): Promise<void> {},
    async updateAvatar(): Promise<void> {},
    async updateEmail(): Promise<void> {},
    async updateBirthDate(): Promise<void> {},
    async updateTitle(): Promise<void> {},
    async searchUsers(): Promise<any[]> {
      return [];
    },
  };

  return { campaignRepo, userRepo, campaigns, users, participants, createdCharacters };
}

describe('ValidateParticipantUseCase', () => {
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

  const sampleUser: User = {
    id: 2,
    username: 'Joueur1',
    mail: 'joueur1@test.com',
    avatar: 'avatar1.png',
    description: 'Joueur motivé',
    profil: 1,
    titre: 'Aventurier',
    subscribe_date: '2026-01-01',
  };

  it('valide l’inscription du joueur et crée automatiquement son personnage', async () => {
    const { campaignRepo, userRepo, participants, createdCharacters } = createMockRepos(
      [sampleCampaign],
      [sampleUser]
    );
    participants.set('10-2', 0); // en attente

    const useCase = new ValidateParticipantUseCase(campaignRepo, userRepo);
    const result = await useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 });

    assert.equal(result.success, true);
    assert.equal(participants.get('10-2'), 1);
    assert.equal(createdCharacters.length, 1);
    assert.equal(createdCharacters[0].userId, 2);
    assert.equal(createdCharacters[0].campagneId, 10);
    assert.equal(createdCharacters[0].name, 'Joueur1');
    assert.equal(createdCharacters[0].avatar, 'avatar1.png');
  });

  it('lève une ForbiddenError si l’utilisateur appelant n’est pas le MJ', async () => {
    const { campaignRepo, userRepo } = createMockRepos([sampleCampaign], [sampleUser]);
    const useCase = new ValidateParticipantUseCase(campaignRepo, userRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 99, targetUserId: 2 }),
      ForbiddenError
    );
  });

  it('lève une CampaignNotFoundError si la campagne n’existe pas', async () => {
    const { campaignRepo, userRepo } = createMockRepos([], [sampleUser]);
    const useCase = new ValidateParticipantUseCase(campaignRepo, userRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 2 }),
      CampaignNotFoundError
    );
  });

  it('lève une UserNotFoundError si le joueur cible n’existe pas', async () => {
    const { campaignRepo, userRepo } = createMockRepos([sampleCampaign], []);
    const useCase = new ValidateParticipantUseCase(campaignRepo, userRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, mjId: 1, targetUserId: 999 }),
      UserNotFoundError
    );
  });
});
