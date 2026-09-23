import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateNotificationSettingsUseCase } from './update-notification-settings.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { UserNotFoundError } from '../../errors/domain.errors.js';
import { NotificationSettings, User } from '../../types/index.js';

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
      notif_mp: 1,
      notif_inscription: 1,
      notif_perso: 1,
      notif_message: 1,
      mail_mp: 1,
      mail_inscription: 0,
      mail_perso: 0,
      mail_message: 0,
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateProfile(id: number, data: any): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...this.users[userIndex], ...data };
    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  async updateNotificationSettings(id: number, settings: NotificationSettings): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...this.users[userIndex], ...settings };
    this.users[userIndex] = updatedUser;
    return updatedUser;
  }
}

describe('UpdateNotificationSettingsUseCase', () => {
  it('should throw UserNotFoundError when user does not exist', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateNotificationSettingsUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute(999, { notif_mp: 0 });
      },
      (err: unknown) => {
        assert.ok(err instanceof UserNotFoundError);
        return true;
      }
    );
  });

  it('should update notification settings for existing user', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateNotificationSettingsUseCase(repo);

    const createdUser = await repo.create({
      username: 'testuser',
      mail: 'test@example.com',
      passwordHash: 'hashed',
    });

    const result = await useCase.execute(createdUser.id, {
      notif_mp: 0,
      notif_inscription: 0,
      mail_mp: 0,
      mail_inscription: 1,
    });

    assert.equal(result.notif_mp, 0);
    assert.equal(result.notif_inscription, 0);
    assert.equal(result.mail_mp, 0);
    assert.equal(result.mail_inscription, 1);
    // Other settings should remain unchanged
    assert.equal(result.notif_perso, 1);
    assert.equal(result.notif_message, 1);
    assert.equal(result.mail_perso, 0);
    assert.equal(result.mail_message, 0);
  });

  it('should update only provided notification settings', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdateNotificationSettingsUseCase(repo);

    const createdUser = await repo.create({
      username: 'testuser',
      mail: 'test@example.com',
      passwordHash: 'hashed',
    });

    const result = await useCase.execute(createdUser.id, {
      notif_message: 0,
    });

    assert.equal(result.notif_message, 0);
    // Other settings should remain unchanged
    assert.equal(result.notif_mp, 1);
    assert.equal(result.notif_inscription, 1);
    assert.equal(result.mail_mp, 1);
  });
});
