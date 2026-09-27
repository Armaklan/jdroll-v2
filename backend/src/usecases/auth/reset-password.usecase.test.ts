import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResetPasswordUseCase } from './reset-password.usecase.js';
import { IUserPasswordResetRepository } from '../../repositories/user.repository.js';
import { InvalidPasswordResetTokenError, ExpiredPasswordResetTokenError } from '../../errors/domain.errors.js';
import { UserWithPassword } from '../../types/index.js';
import { md5 } from '../../utils/auth.js';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

class InMemoryPasswordResetRepository implements IUserPasswordResetRepository {
  private users: (UserWithPassword & { password: string })[] = [];
  private resetTokens = new Map<number, { alea: string; date: Date }>();
  public resetCalls: { id: number; alea: string; newPasswordHash: string }[] = [];

  addUser(user: UserWithPassword & { password: string }): void {
    this.users.push(user);
  }

  getPassword(id: number): string | undefined {
    return this.users.find((u) => u.id === id)?.password;
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user || null;
  }

  async setPasswordResetToken(id: number, alea: string): Promise<void> {
    this.resetTokens.set(id, { alea, date: new Date() });
  }

  async findPasswordResetToken(id: number): Promise<{ reinitAlea: string; reinitDate: Date } | null> {
    const token = this.resetTokens.get(id);
    if (!token) return null;
    return { reinitAlea: token.alea, reinitDate: token.date };
  }

  async resetPasswordWithToken(id: number, alea: string, newPasswordHash: string): Promise<void> {
    const token = this.resetTokens.get(id);
    if (!token || token.alea !== alea) {
      throw new Error('Token de réinitialisation invalide');
    }
    this.resetCalls.push({ id, alea, newPasswordHash });
    const user = this.users.find((u) => u.id === id);
    if (user) {
      user.password = newPasswordHash;
    }
    this.resetTokens.delete(id);
  }
}

function setup(tokenAgeMs: number): {
  repo: InMemoryPasswordResetRepository;
  useCase: ResetPasswordUseCase;
  alea: string;
} {
  const repo = new InMemoryPasswordResetRepository();
  repo.addUser({
    id: 1,
    username: 'armaklan',
    mail: 'armaklan@example.com',
    password: 'oldhash',
    avatar: '',
    description: '',
    profil: 0,
    titre: '',
    subscribe_date: '2024-01-01T00:00:00.000Z',
    birthDate: null,
  });
  const alea = 'a'.repeat(48);
  repo.resetTokens.set(1, { alea, date: new Date(Date.now() - tokenAgeMs) });
  const useCase = new ResetPasswordUseCase(repo);
  return { repo, useCase, alea };
}

describe('ResetPasswordUseCase', () => {
  it("définit le nouveau mot de passe et invalide le token s'il est valide et récent", async () => {
    const { repo, useCase, alea } = setup(10 * 60 * 1000);

    await useCase.execute({ userId: 1, alea, newPassword: 'nouveaumdp' });

    assert.equal(repo.getPassword(1), md5('nouveaumdp'));
    assert.equal(await repo.findPasswordResetToken(1), null, 'Le token doit être invalidé après usage');
  });

  it("rejette le renouvellement si le token a plus de 30 minutes", async () => {
    const { repo, useCase, alea } = setup(THIRTY_MINUTES_MS + 60 * 1000);

    await assert.rejects(
      () => useCase.execute({ userId: 1, alea, newPassword: 'nouveaumdp' }),
      ExpiredPasswordResetTokenError
    );

    assert.equal(repo.getPassword(1), 'oldhash');
    assert.equal(repo.resetCalls.length, 0);
  });

  it("rejette le renouvellement si l'alea ne correspond pas", async () => {
    const { repo, useCase } = setup(10 * 60 * 1000);

    await assert.rejects(
      () => useCase.execute({ userId: 1, alea: 'b'.repeat(48), newPassword: 'nouveaumdp' }),
      InvalidPasswordResetTokenError
    );

    assert.equal(repo.getPassword(1), 'oldhash');
  });

  it('rejette le renouvellement si aucun token ne existe', async () => {
    const repo = new InMemoryPasswordResetRepository();
    const useCase = new ResetPasswordUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ userId: 42, alea: 'b'.repeat(48), newPassword: 'nouveaumdp' }),
      InvalidPasswordResetTokenError
    );
  });
});
