import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateUserProfileUseCase } from './update-user-profile.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { UpdateUserProfileData, User } from '../../types/index.js';
import { UserNotFoundError } from '../../errors/domain.errors.js';

class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    return this.users.find((u) => u.username === identifier || u.mail === identifier) || null;
  }

  async findByUsernames(usernames: string[]): Promise<User[]> {
    return this.users.filter((u) => usernames.includes(u.username));
  }

  async searchByUsername(query: string, excludeId?: number): Promise<{ id: number; username: string; avatar: string }[]> {
    return [];
  }

  async existsByUsernameOrEmail(username: string, mail: string): Promise<boolean> {
    return this.users.some((u) => u.username === username || u.mail === mail);
  }

  async create(data: any): Promise<User> {
    const newUser: User = {
      id: this.nextId++,
      username: data.username,
      mail: data.mail,
      avatar: data.avatar || '',
      description: data.description || '',
      profil: data.profil || 0,
      titre: data.titre || '',
      subscribe_date: new Date().toISOString(),
      birthDate: null,
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateProfile(id: number, data: UpdateUserProfileData): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }

    const updatedUser = {
      ...this.users[userIndex],
      ...data,
    };
    this.users[userIndex] = updatedUser;
    return updatedUser;
  }
}

describe('UpdateUserProfileUseCase', () => {
  it('should throw UserNotFoundError when user does not exist', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute(999, { mail: 'newmail@example.com' });
      },
      (err: unknown) => {
        assert.ok(err instanceof UserNotFoundError);
        return true;
      }
    );
  });

  it('should update user profile with new data', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    // Create a user first
    const createdUser = await repo.create({
      username: 'testuser',
      mail: 'oldmail@example.com',
      passwordHash: 'hashed',
    });

    const result = await useCase.execute(createdUser.id, {
      mail: 'newmail@example.com',
      avatar: 'new-avatar.png',
      description: 'new description',
      titre: 'new title',
      birthDate: '2001-01-01',
    });

    assert.equal(result.mail, 'newmail@example.com');
    assert.equal(result.avatar, 'new-avatar.png');
    assert.equal(result.description, 'new description');
    assert.equal(result.titre, 'new title');
    assert.equal(result.birthDate, '2001-01-01');
    assert.equal(result.username, 'testuser'); // username should not change
    assert.equal(result.id, createdUser.id); // id should not change
  });

  it('should update only provided fields', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateUserProfileUseCase(repo);

    // Create a user first
    const createdUser = await repo.create({
      username: 'testuser',
      mail: 'oldmail@example.com',
      passwordHash: 'hashed',
      avatar: 'old-avatar.png',
      description: 'old description',
    });

    const result = await useCase.execute(createdUser.id, {
      avatar: 'new-avatar.png',
    });

    assert.equal(result.avatar, 'new-avatar.png');
    assert.equal(result.mail, 'oldmail@example.com'); // unchanged
    assert.equal(result.description, 'old description'); // unchanged
  });
});
