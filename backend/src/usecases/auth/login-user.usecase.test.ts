import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LoginUserUseCase } from './login-user.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { User, UserWithPassword, CreateUserData } from '../../types/index.js';
import { InvalidCredentialsError } from '../../errors/domain.errors.js';
import { md5 } from '../../utils/auth.js';

class MockUserRepository implements IUserRepository {
  private users: (User & { password?: string })[] = [];
  private lastActionUpdates: number[] = [];

  constructor(initialUsers: (User & { password?: string })[] = []) {
    this.users = initialUsers;
  }

  async updateLastAction(id: number): Promise<void> {
    this.lastActionUpdates.push(id);
  }

  getLastActionUpdates(): number[] {
    return [...this.lastActionUpdates];
  }

  async findById(id: number): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user ? { ...user } : null;
  }

  async existsByUsernameOrEmail(username: string, mail: string): Promise<boolean> {
    return this.users.some((u) => u.username === username || u.mail === mail);
  }

  async create(data: CreateUserData): Promise<User> {
    const newUser = {
      id: 99,
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
}

describe('LoginUserUseCase', () => {
  const existingUser: User & { password?: string } = {
    id: 1,
    username: 'testuser',
    mail: 'test@example.com',
    password: md5('correctPassword'),
    avatar: '',
    description: '',
    profil: 0,
    titre: '',
    subscribe_date: '2026-09-13',
    birthDate: null,
  };

  it('should authenticate user with valid credentials', async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    const user = await useCase.execute({
      username: 'testuser',
      password: 'correctPassword',
    });

    assert.equal(user.id, 1);
    assert.equal(user.username, 'testuser');
    assert.equal((user as { password?: string }).password, undefined);
  });

  it("marque la dernière action de l'utilisateur lors d'une connexion réussie", async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    await useCase.execute({
      username: 'testuser',
      password: 'correctPassword',
    });

    assert.deepEqual(repo.getLastActionUpdates(), [1]);
  });

  it('ne marque pas la dernière action quand les identifiants sont invalides', async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    await assert.rejects(() =>
      useCase.execute({ username: 'testuser', password: 'wrongPassword' })
    );

    assert.deepEqual(repo.getLastActionUpdates(), []);
  });

  it('should authenticate user using email', async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    const user = await useCase.execute({
      username: 'test@example.com',
      password: 'correctPassword',
    });

    assert.equal(user.id, 1);
  });

  it('should throw InvalidCredentialsError for non-existing user', async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          username: 'unknown',
          password: 'password',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidCredentialsError);
        return true;
      }
    );
  });

  it('should throw InvalidCredentialsError for incorrect password', async () => {
    const repo = new MockUserRepository([existingUser]);
    const useCase = new LoginUserUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          username: 'testuser',
          password: 'wrongPassword',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidCredentialsError);
        return true;
      }
    );
  });
});
