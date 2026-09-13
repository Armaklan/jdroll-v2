import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RegisterUserUseCase } from './register-user.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { User, UserWithPassword, CreateUserData } from '../../types/index.js';
import { UserAlreadyExistsError } from '../../errors/domain.errors.js';
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

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user || null;
  }

  async existsByUsernameOrEmail(username: string, mail: string): Promise<boolean> {
    return this.users.some((u) => u.username === username || u.mail === mail);
  }

  async create(data: CreateUserData): Promise<User> {
    const newUser = {
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
}

describe('RegisterUserUseCase', () => {
  it('should register a new user successfully', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCase(repo);

    const user = await useCase.execute({
      username: 'newuser',
      mail: 'new@example.com',
      password: 'mypassword',
    });

    assert.equal(user.username, 'newuser');
    assert.equal(user.mail, 'new@example.com');
    assert.equal(user.id, 1);

    const stored = await repo.findByUsernameOrEmail('newuser');
    assert.ok(stored);
    assert.equal(stored.password, md5('mypassword'));
  });

  it('should throw UserAlreadyExistsError when username is already taken', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      username: 'existinguser',
      mail: 'first@example.com',
      password: 'password',
    });

    await assert.rejects(
      async () => {
        await useCase.execute({
          username: 'existinguser',
          mail: 'other@example.com',
          password: 'password',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof UserAlreadyExistsError);
        return true;
      }
    );
  });
});
