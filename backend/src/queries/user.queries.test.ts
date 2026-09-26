import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserQueries } from './user.queries.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { IAbsenceRepository } from '../repositories/absence.repository.js';
import { User, UserWithPassword, CreateUserData, Absence } from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  constructor(users: User[] = []) {
    this.users = users;
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

  describe('getPublicProfile', () => {
    const currentAbsence: Absence = {
      id: 7,
      userId: 42,
      beginDate: '2026-09-20',
      endDate: '2026-09-30',
      commentaire: 'Vacances en famille',
    };

    it('should return the public profile with current absences', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository([currentAbsence]);
      const queries = new UserQueries(userRepo, absenceRepo);

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

    it('should not expose private data (mail, notification settings)', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository([currentAbsence]);
      const queries = new UserQueries(userRepo, absenceRepo);

      const profile = await queries.getPublicProfile(42) as any;

      assert.equal(profile.mail, undefined);
      assert.equal(profile.notif_mp, undefined);
      assert.equal(profile.password, undefined);
    });

    it('should return an empty list of absences when the user has none in progress', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository();
      const queries = new UserQueries(userRepo, absenceRepo);

      const profile = await queries.getPublicProfile(42);

      assert.deepEqual(profile.currentAbsences, []);
    });

    it('should throw UserNotFoundError when user is not found', async () => {
      const userRepo = new MockUserRepository([sampleUser]);
      const absenceRepo = new MockAbsenceRepository();
      const queries = new UserQueries(userRepo, absenceRepo);

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
