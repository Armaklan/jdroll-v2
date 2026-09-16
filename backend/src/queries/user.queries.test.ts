import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserQueries } from './user.queries.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { User, UserWithPassword, CreateUserData } from '../types/index.js';
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
});
