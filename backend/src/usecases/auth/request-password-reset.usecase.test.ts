import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RequestPasswordResetUseCase } from './request-password-reset.usecase.js';
import { IUserPasswordResetRepository } from '../../repositories/user.repository.js';
import { IMailerService, SendEmailInput } from '../../services/mailer.service.js';
import { UserWithPassword } from '../../types/index.js';

class InMemoryPasswordResetRepository implements IUserPasswordResetRepository {
  private users: (UserWithPassword & { password: string })[] = [];
  private resetTokens = new Map<number, string>();
  public setPasswordResetTokenCalls: { id: number; alea: string }[] = [];

  addUser(user: UserWithPassword & { password: string }): void {
    this.users.push(user);
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = this.users.find((u) => u.username === identifier || u.mail === identifier);
    return user || null;
  }

  async setPasswordResetToken(id: number, alea: string): Promise<void> {
    this.setPasswordResetTokenCalls.push({ id, alea });
    this.resetTokens.set(id, alea);
  }

  async findPasswordResetToken(id: number): Promise<{ reinitAlea: string; reinitDate: Date } | null> {
    const alea = this.resetTokens.get(id);
    if (alea === undefined) return null;
    return { reinitAlea: alea, reinitDate: new Date() };
  }

  async resetPasswordWithToken(id: number, alea: string, newPasswordHash: string): Promise<void> {
    const user = this.users.find((u) => u.id === id);
    if (!user || this.resetTokens.get(id) !== alea) {
      throw new Error('Token de réinitialisation invalide');
    }
    user.password = newPasswordHash;
    this.resetTokens.delete(id);
  }
}

class FakeMailer implements IMailerService {
  readonly siteUrl: string | null;
  public sent: SendEmailInput[] = [];

  constructor(siteUrl: string | null = 'https://www.jdroll.fr') {
    this.siteUrl = siteUrl;
  }

  isConfigured(): boolean {
    return true;
  }

  async sendEmail(input: SendEmailInput): Promise<boolean> {
    this.sent.push(input);
    return true;
  }
}

function makeUser(overrides: Partial<UserWithPassword & { password: string }> = {}): UserWithPassword & { password: string } {
  return {
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
    ...overrides,
  };
}

describe('RequestPasswordResetUseCase', () => {
  it("génère un token, enregistre reinitAlea/reinitDate et envoie un mail avec le lien de renouvellement", async () => {
    const repo = new InMemoryPasswordResetRepository();
    const mailer = new FakeMailer();
    repo.addUser(makeUser());
    const useCase = new RequestPasswordResetUseCase(repo, mailer);

    await useCase.execute({ identifier: 'armaklan' });

    assert.equal(repo.setPasswordResetTokenCalls.length, 1);
    const { id, alea } = repo.setPasswordResetTokenCalls[0];
    assert.equal(id, 1);
    assert.match(alea, /^[0-9a-f]+$/);
    assert.ok(alea.length > 0 && alea.length <= 50, 'Le token doit tenir dans la colonne reinitAlea varchar(50)');

    assert.equal(mailer.sent.length, 1);
    const email = mailer.sent[0];
    assert.equal(email.to, 'armaklan@example.com');
    assert.ok(email.subject.toLowerCase().includes('mot de passe'), 'Le sujet doit mentionner le mot de passe');
    assert.ok(email.html.includes('user=1'), "Le lien doit contenir l'identifiant de l'utilisateur");
    assert.ok(email.html.includes(`alea=${alea}`), 'Le lien doit contenir le token');
    assert.ok(email.html.includes('https://www.jdroll.fr/reset-password'), 'Le lien doit pointer vers la page de renouvellement');

    assert.ok(email.html.startsWith('<!DOCTYPE html>'), "Le mail doit utiliser le gabarit HTML stylé de l'application");
    assert.ok(email.html.includes('background-color:#8844CC'), 'Le lien de renouvellement doit être mis en valeur par un bouton');
    assert.ok(email.html.includes('Renouveler mon mot de passe'));
    assert.ok(email.html.includes('valide pendant') && email.html.includes('30 minutes'), 'La durée de validité doit rester mentionnée');
  });

  it('trouve aussi le utilisateur par son adresse email', async () => {
    const repo = new InMemoryPasswordResetRepository();
    const mailer = new FakeMailer();
    repo.addUser(makeUser());
    const useCase = new RequestPasswordResetUseCase(repo, mailer);

    await useCase.execute({ identifier: 'armaklan@example.com' });

    assert.equal(repo.setPasswordResetTokenCalls.length, 1);
    assert.equal(mailer.sent.length, 1);
  });

  it("ne fait rien et ne révèle rien si l'identifiant est inconnu", async () => {
    const repo = new InMemoryPasswordResetRepository();
    const mailer = new FakeMailer();
    repo.addUser(makeUser());
    const useCase = new RequestPasswordResetUseCase(repo, mailer);

    await assert.doesNotReject(() => useCase.execute({ identifier: 'inconnu' }));

    assert.equal(repo.setPasswordResetTokenCalls.length, 0);
    assert.equal(mailer.sent.length, 0);
  });
});
