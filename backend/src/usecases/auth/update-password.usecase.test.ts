import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdatePasswordUseCase } from './update-password.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { UserNotFoundError, InvalidCredentialsError } from '../../errors/domain.errors.js';
import { User } from '../../types/index.js';
import { md5 } from '../../utils/auth.js';

class InMemoryUserRepository implements IUserRepository {
  private users: (User & { password?: string })[] = [];
  private nextId = 1;

  async findById(id: number): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user || null;
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
    const newUser: User & { password: string } = {
      id: this.nextId++,
      username: data.username,
      mail: data.mail,
      password: data.passwordHash,
      avatar: data.avatar || '',
      description: data.description || '',
      profil: data.profil || 0,
      titre: data.titre || '',
      subscribe_date: new Date().toISOString(),
      birthDate: null,
    };
    this.users.push(newUser);
    const { password: _, ...safeUser } = newUser;
    return safeUser;
  }

  async updateProfile(id: number, data: any): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...this.users[userIndex], ...data };
    this.users[userIndex] = updatedUser;
    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  async updateNotificationSettings(id: number, settings: any): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    const updatedUser = { ...this.users[userIndex], ...settings };
    this.users[userIndex] = updatedUser;
    const { password: _, ...safeUser } = updatedUser;
    return safeUser;
  }

  async updatePassword(id: number, currentPasswordHash: string, newPasswordHash: string): Promise<void> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with ID ${id} not found`);
    }
    if (this.users[userIndex].password !== currentPasswordHash) {
      throw new Error('Mot de passe actuel incorrect');
    }
    this.users[userIndex].password = newPasswordHash;
  }
}

describe('UpdatePasswordUseCase', () => {
  it('should throw UserNotFoundError when user does not exist', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdatePasswordUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute(999, { currentPassword: 'oldhash', newPassword: 'newhash' });
      },
      (err: unknown) => {
        assert.ok(err instanceof UserNotFoundError);
        return true;
      }
    );
  });

  it('should throw InvalidCredentialsError when current password is incorrect', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdatePasswordUseCase(repo);

    // Create a user with a password
    await repo.create({
      username: 'testuser',
      mail: 'test@example.com',
      passwordHash: md5('correctpassword'),
    });

    await assert.rejects(
      async () => {
        await useCase.execute(1, { currentPassword: 'wrongpassword', newPassword: 'newpassword' });
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidCredentialsError);
        return true;
      }
    );
  });

  it('should update password when current password is correct', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new UpdatePasswordUseCase(repo);

    // Create a user with a password
    await repo.create({
      username: 'testuser',
      mail: 'test@example.com',
      passwordHash: md5('oldpassword'),
    });

    // Should not throw
    await useCase.execute(1, { currentPassword: 'oldpassword', newPassword: 'newpassword' });

    // Verify the password was updated
    const userWithPassword = await repo.findByUsernameOrEmail('testuser');
    assert.equal(userWithPassword?.password, md5('newpassword'));
  });
});
