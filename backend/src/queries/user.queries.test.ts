import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserQueries } from './user.queries.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { IAbsenceRepository } from '../repositories/absence.repository.js';
import {
  ICampaignRepository,
  CreateCampaignData,
  UpdateCampaignData,
} from '../repositories/campaign.repository.js';
import {
  User,
  UserWithPassword,
  CreateUserData,
  Absence,
  CampaignSummary,
  RawCampaignCharacterRow,
  RawPnjCategoryRow,
  CampaignParticipant,
} from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

class MockUserRepository implements IUserRepository {
  private users: User[] = [];
  private members: any[] = [];
  private lastActions: Map<number, string | null> = new Map();

  constructor(users: User[] = [], members: any[] = []) {
    this.users = users;
    this.members = members;
  }

  async findLastActionDateByUser(userId: number): Promise<string | null> {
    return this.lastActions.get(userId) ?? null;
  }

  setLastActionDate(userId: number, date: string | null): void {
    this.lastActions.set(userId, date);
  }

  async findById(id: number): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    return user || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user || null;
  }

  async existsByUsernameOrEmail(username: string, mail: string): Promise<boolean> {
    return this.users.some((u) => u.username === username || u.mail === mail);
  }

  async findByUsernames(usernames: string[]): Promise<User[]> {
    return this.users.filter((u) => usernames.includes(u.username));
  }

  async searchByUsername(query: string, limit?: number): Promise<any[]> {
    return this.users.filter((u) => u.username.toLowerCase().includes(query.toLowerCase()));
  }

  async findMembersWithAtLeastOnePost(): Promise<any[]> {
    return this.members;
  }

  async create(data: CreateUserData): Promise<User> {
    const newUser: User = {
      id: 1,
      username: data.username,
      mail: data.mail,
      avatar: '',
      description: '',
      profil: 0,
      titre: '',
      subscribe_date: '2026-09-13',
    };
    this.users.push(newUser);
    return newUser;
  }
}

class MockAbsenceRepository implements IAbsenceRepository {
  private absences: Absence[] = [];

  constructor(absences: Absence[] = []) {
    this.absences = absences;
  }

  async findByUser(userId: number): Promise<Absence[]> {
    return this.absences.filter((a) => a.userId === userId);
  }

  async findById(id: number): Promise<Absence | null> {
    return this.absences.find((a) => a.id === id) || null;
  }

  async create(userId: number, beginDate: string, endDate: string, commentaire: string): Promise<Absence> {
    const absence: Absence = { id: 1, userId, beginDate, endDate, commentaire };
    this.absences.push(absence);
    return absence;
  }

  async updateByIdAndUser(id: number, userId: number, beginDate: string, endDate: string, commentaire: string): Promise<boolean> {
    return true;
  }

  async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
    return true;
  }

  async findCurrentByCampaignId(campaignId: number, excludeUserId?: number): Promise<any[]> {
    return [];
  }

  async findCurrentByUser(userId: number): Promise<Absence[]> {
    return this.absences.filter((a) => a.userId === userId);
  }
}

class MockCampaignRepository implements ICampaignRepository {
  constructor(
    private mastered: CampaignSummary[] = [],
    private player: CampaignSummary[] = []
  ) {}

  async findMasteredCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]> {
    return this.mastered.filter((c) => c.mjId === userId && (includeArchived || !c.isArchived));
  }

  async findPlayerCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]> {
    return this.player.filter((c) => (includeArchived || !c.isArchived));
  }

  async findObservedCampaigns(): Promise<CampaignSummary[]> {
    return [];
  }

  async findAllCampaigns(): Promise<CampaignSummary[]> {
    return [];
  }

  async findById(): Promise<CampaignSummary | null> {
    return null;
  }

  async createCampaign(data: CreateCampaignData): Promise<number> {
    return 1;
  }

  async updateCampaign(id: number, data: UpdateCampaignData): Promise<void> {}

  async findCampaignCharacters(): Promise<RawCampaignCharacterRow[]> {
    return [];
  }

  async searchCampaignCharacters(): Promise<RawCampaignCharacterRow[]> {
    return [];
  }

  async findCampaignPnjCategories(): Promise<RawPnjCategoryRow[]> {
    return [];
  }

  async findPnjCategoryById(): Promise<RawPnjCategoryRow | null> {
    return null;
  }

  async createPnjCategory(): Promise<number> {
    return 1;
  }

  async updatePnjCategory(): Promise<void> {}

  async deletePnjCategory(): Promise<void> {}

  async findCharacterById(): Promise<RawCampaignCharacterRow | null> {
    return null;
  }

  async createCharacter(): Promise<number> {
    return 1;
  }

  async updateCharacter(): Promise<void> {}

  async deleteCharacter(): Promise<void> {}

  async updateCampaignBanner(): Promise<void> {}

  async findCampaignParticipants(): Promise<CampaignParticipant[]> {
    return [];
  }

  async findPendingCampaignParticipants(): Promise<CampaignParticipant[]> {
    return [];
  }

  async isUserCampaignParticipant(): Promise<boolean> {
    return false;
  }

  async getCampaignParticipantStatus(): Promise<number | null> {
    return null;
  }

  async isUserCampaignPending(): Promise<boolean> {
    return false;
  }

  async addCampaignParticipant(): Promise<void> {}

  async validateCampaignParticipant(): Promise<void> {}

  async removeCampaignParticipant(): Promise<void> {}

  async isUserCampaignObserver(): Promise<boolean> {
    return false;
  }

  async addCampaignObserver(): Promise<void> {}

  async removeCampaignObserver(): Promise<void> {}

  async findCampaignObservers(): Promise<Array<{ id: number; username: string; avatar: string | null }>> {
    return [];
  }

  async isUserCampaignAlert(): Promise<boolean> {
    return false;
  }

  async addCampaignAlert(): Promise<void> {}

  async removeCampaignAlert(): Promise<void> {}
}

describe('UserQueries', () => {
  const sampleUser: User = {
    id: 42,
    username: 'mj_master',
    mail: 'mj@example.com',
    avatar: 'avatar.png',
    description: 'Game Master',
    profil: 1,
    titre: 'Le Conteur',
    subscribe_date: '2026-09-13',
    birthDate: null,
  };

  it('should return user profile when user exists', async () => {
    const repo = new MockUserRepository([sampleUser]);
    const queries = new UserQueries(repo);

    const profile = await queries.getUserProfile(42);
    assert.equal(profile.id, 42);
    assert.equal(profile.username, 'mj_master');
  });

  it('should throw UserNotFoundError when user is not found', async () => {
    const repo = new MockUserRepository([sampleUser]);
    const queries = new UserQueries(repo);

    await assert.rejects(
      async () => {
        await queries.getUserProfile(999);
      },
      (err: unknown) => {
        assert.ok(err instanceof UserNotFoundError);
        return true;
      }
    );
  });

  it('should return null with getUserById when user does not exist', async () => {
    const repo = new MockUserRepository([sampleUser]);
    const queries = new UserQueries(repo);

    const result = await queries.getUserById(999);
    assert.equal(result, null);
  });

  describe('getMembers', () => {
    it('should list the members having at least one post', async () => {
      const members = [
        { id: 1, username: 'joueur1', avatar: 'a.png', profil: 0, titre: '', subscribeDate: '2026-01-10', lastActionDate: '2026-09-26 18:30:00' },
        { id: 2, username: 'mj_master', avatar: 'avatar.png', profil: 1, titre: 'Le Conteur', subscribeDate: '2026-09-13', lastActionDate: null },
      ];
      const repo = new MockUserRepository([sampleUser], members);
      const queries = new UserQueries(repo);

      const result = await queries.getMembers();
      assert.equal(result.length, 2);
      assert.equal(result[0].username, 'joueur1');
      assert.equal(result[0].avatar, 'a.png');
      assert.equal(result[0].lastActionDate, '2026-09-26 18:30:00');
      assert.equal(result[1].username, 'mj_master');
    });

    it('should return the last action date of each member', async () => {
      const members = [
        { id: 1, username: 'joueur1', avatar: 'a.png', profil: 0, titre: '', subscribeDate: '2026-01-10', lastActionDate: '2026-09-27 09:00:00' },
        { id: 2, username: 'joueur2', avatar: '', profil: 0, titre: '', subscribeDate: '2026-01-11', lastActionDate: null },
      ];
      const repo = new MockUserRepository([sampleUser], members);
      const queries = new UserQueries(repo);

      const result = await queries.getMembers();
      assert.equal(result[0].lastActionDate, '2026-09-27 09:00:00');
      assert.equal(result[1].lastActionDate, null);
    });

    it('should return an empty list when no member has posted', async () => {
      const repo = new MockUserRepository([sampleUser], []);
      const queries = new UserQueries(repo);

      const result = await queries.getMembers();
      assert.deepEqual(result, []);
    });

    it('should not expose private data (mail, notification settings)', async () => {
      const members = [
        { id: 1, username: 'joueur1', avatar: 'a.png', profil: 0, titre: '', subscribeDate: '2026-01-10', lastActionDate: null },
      ];
      const repo = new MockUserRepository([sampleUser], members);
      const queries = new UserQueries(repo);

      const result = await queries.getMembers();
      assert.equal(Object.prototype.hasOwnProperty.call(result[0], 'mail'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(result[0], 'password'), false);
    });
  });

  describe('getPublicProfile', () => {
    const currentAbsence: Absence = {
      id: 7,
      userId: 42,
      beginDate: '2026-09-20',
      endDate: '2026-09-30',
      commentaire: 'Vacances en famille',
    };

    const masteredActiveCampaign: CampaignSummary = {
      id: 101,
      name: 'La Tour de l\'Archimage',
      mjId: 42,
      mjUsername: 'mj_master',
      nbJoueurs: 4,
      nbJoueursActuel: 3,
      banniere: '',
      systeme: 'D&D 5e',
      univers: 'Fantasy',
      description: 'Une aventure épique',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: true,
      hasUnread: true,
      hasAlert: true,
    };

    const masteredPreparationCampaign: CampaignSummary = {
      ...masteredActiveCampaign,
      id: 102,
      name: 'Projet secret',
      statut: 3,
    };

    const masteredArchivedCampaign: CampaignSummary = {
      ...masteredActiveCampaign,
      id: 103,
      name: 'Vieille campagne maîtrisée archivée',
      statut: 2,
      isArchived: true,
    };

    const playedCampaign: CampaignSummary = {
      id: 201,
      name: 'Les Marais de Corvèche',
      mjId: 77,
      mjUsername: 'autre_mj',
      nbJoueurs: 5,
      nbJoueursActuel: 5,
      banniere: '',
      systeme: ' Pathfinder',
      univers: 'Dark Fantasy',
      description: 'Une autre aventure',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: false,
      hasUnread: false,
      hasAlert: false,
    };

    const playedArchivedCampaign: CampaignSummary = {
      ...playedCampaign,
      id: 202,
      name: 'Vieille campagne archivée',
      statut: 2,
      isArchived: true,
    };

    it('should return the public profile with current absences', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository([currentAbsence]);
      const queries = new UserQueries(userRepo, absenceRepo, new MockCampaignRepository());

      const profile = await queries.getPublicProfile(42);

      assert.equal(profile.id, 42);
      assert.equal(profile.username, 'mj_master');
      assert.equal(profile.avatar, 'avatar.png');
      assert.equal(profile.description, 'Game Master');
      assert.equal(profile.titre, 'Le Conteur');
      assert.equal(profile.profil, 1);
      assert.equal(profile.subscribeDate, '2026-09-13');
      assert.equal(profile.birthDate, null);
      assert.deepEqual(profile.currentAbsences, [currentAbsence]);
    });

    it('should return the birth date and the last activity date of the member', async () => {
      const userRepo = new MockUserRepository([{ ...sampleUser, birthDate: '1990-05-05' }]);
      userRepo.setLastActionDate(42, '2026-09-27 18:30:00');
      const queries = new UserQueries(userRepo, new MockAbsenceRepository(), new MockCampaignRepository());

      const profile = await queries.getPublicProfile(42);

      assert.equal(profile.birthDate, '1990-05-05');
      assert.equal(profile.lastActionDate, '2026-09-27 18:30:00');
    });

    it('should return a null last activity date when the member never logged in', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(userRepo, new MockAbsenceRepository(), new MockCampaignRepository());

      const profile = await queries.getPublicProfile(42);

      assert.equal(profile.birthDate, null);
      assert.equal(profile.lastActionDate, null);
    });

    it('should list the campaigns the user masters (id, name, archived flag)', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository([masteredActiveCampaign], [])
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.masteredCampaigns, [
        { id: 101, name: "La Tour de l'Archimage", isArchived: false },
      ]);
    });

    it('should list the campaigns the user plays in (id, name, archived flag)', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository([], [playedCampaign])
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.playedCampaigns, [
        { id: 201, name: 'Les Marais de Corvèche', isArchived: false },
      ]);
    });

    it('should list a campaign only once when the user has several characters in it', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository([], [playedCampaign, playedCampaign])
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.playedCampaigns, [
        { id: 201, name: 'Les Marais de Corvèche', isArchived: false },
      ]);
    });

    it('should list open campaigns before archived ones', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository(
          [masteredArchivedCampaign, masteredActiveCampaign],
          [playedArchivedCampaign, playedCampaign]
        )
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.masteredCampaigns.map((c) => c.id), [101, 103]);
      assert.deepEqual(profile.playedCampaigns.map((c) => c.id), [201, 202]);
    });

    it('should not expose read indicators or other campaign details', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository([masteredActiveCampaign], [playedCampaign])
      );

      const profile = await queries.getPublicProfile(42);

      const mastered = profile.masteredCampaigns[0] as unknown as Record<string, unknown>;
      const played = profile.playedCampaigns[0] as unknown as Record<string, unknown>;
      assert.deepEqual(Object.keys(mastered).sort(), ['id', 'isArchived', 'name']);
      assert.deepEqual(Object.keys(played).sort(), ['id', 'isArchived', 'name']);
    });

    it('should exclude preparation campaigns but include archived ones', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository(
          [masteredActiveCampaign, masteredPreparationCampaign],
          [playedCampaign, playedArchivedCampaign]
        )
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.masteredCampaigns, [
        { id: 101, name: "La Tour de l'Archimage", isArchived: false },
      ]);
      assert.deepEqual(profile.playedCampaigns, [
        { id: 201, name: 'Les Marais de Corvèche', isArchived: false },
        { id: 202, name: 'Vieille campagne archivée', isArchived: true },
      ]);
    });

    it('should return empty campaign lists when the user has none', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const queries = new UserQueries(
        userRepo,
        new MockAbsenceRepository(),
        new MockCampaignRepository()
      );

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.masteredCampaigns, []);
      assert.deepEqual(profile.playedCampaigns, []);
    });

    it('should not expose private data (mail, notification settings)', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository([currentAbsence]);
      const queries = new UserQueries(userRepo, absenceRepo, new MockCampaignRepository());

      const profile = await queries.getPublicProfile(42) as any;

      assert.equal(profile.mail, undefined);
      assert.equal(profile.notif_mp, undefined);
      assert.equal(profile.password, undefined);
    });

    it('should return an empty list of absences when the user has none in progress', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository();
      const queries = new UserQueries(userRepo, absenceRepo, new MockCampaignRepository());

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.currentAbsences, []);
    });

    it('should throw UserNotFoundError when user is not found', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository();
      const queries = new UserQueries(userRepo, absenceRepo, new MockCampaignRepository());

      await assert.rejects(
        async () => {
          await queries.getPublicProfile(999);
        },
        (err: unknown) => {
          assert.ok(err instanceof UserNotFoundError);
          return true;
        }
      );
    });
  });
});
