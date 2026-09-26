import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssignUserTitleUseCase } from './assign-user-title.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { UpdateUserProfileData, User } from '../../types/index.js';
import { ForbiddenError, UserNotFoundError, ValidationError } from '../../errors/domain.errors.js';

const ADMIN_PROFILE = 2;

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

describe('AssignUserTitleUseCase', () => {
  it('should allow an administrator to assign a title to a user', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);
    const target = await repo.create({ username: 'cible', mail: 'cible@example.com', passwordHash: 'x' });

    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      userId: target.id,
      titre: 'Conteur émérite',
    });

    assert.equal(result.titre, 'Conteur émérite');
    assert.equal(result.username, 'cible');
  });

  it('should reject a non-administrator requester with ForbiddenError', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);
    const target = await repo.create({ username: 'cible', mail: 'cible@example.com', passwordHash: 'x' });

    await assert.rejects(
      async () => {
        await useCase.execute({ requesterProfil: 0, userId: target.id, titre: 'Escroc' });
      },
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('should throw UserNotFoundError when target user does not exist', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({ requesterProfil: ADMIN_PROFILE, userId: 999, titre: 'Fantôme' });
      },
      (err: unknown) => {
        assert.ok(err instanceof UserNotFoundError);
        return true;
      }
    );
  });

  it('should reject a title longer than 300 characters with ValidationError', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);
    const target = await repo.create({ username: 'cible', mail: 'cible@example.com', passwordHash: 'x' });

    await assert.rejects(
      async () => {
        await useCase.execute({ requesterProfil: ADMIN_PROFILE, userId: target.id, titre: 'a'.repeat(301) });
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );
  });

  it('should allow an empty title to remove it', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);
    const target = await repo.create({
      username: 'cible',
      mail: 'cible@example.com',
      passwordHash: 'x',
      titre: 'Ancien titre',
    });

    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      userId: target.id,
      titre: '',
    });

    assert.equal(result.titre, '');
  });

  it('should not modify anything else than the title', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new AssignUserTitleUseCase(repo);
    const target = await repo.create({
      username: 'cible',
      mail: 'cible@example.com',
      passwordHash: 'x',
      description: 'Description intacte',
    });

    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      userId: target.id,
      titre: 'Nouveau titre',
    });

    assert.equal(result.description, 'Description intacte');
    assert.equal(result.mail, 'cible@example.com');
  });
});
