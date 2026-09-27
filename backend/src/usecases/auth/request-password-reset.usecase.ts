import crypto from 'crypto';
import { IUserPasswordResetRepository, userRepository } from '../../repositories/user.repository.js';
import { IMailerService, mailerService } from '../../services/mailer.service.js';
import { UserWithPassword } from '../../types/index.js';

export interface RequestPasswordResetInput {
  identifier: string;
}

const RESET_TOKEN_BYTES = 24;

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepo: IUserPasswordResetRepository = userRepository,
    private readonly mailer: IMailerService = mailerService
  ) {}

  /**
   * Génère un token de réinitialisation (reinitAlea + reinitDate) et envoie
   * le mail contenant le lien de renouvellement.
   * Ne révèle pas l'existence d'un compte : aucun comportement visible si l'identifiant est inconnu.
   */
  async execute(input: RequestPasswordResetInput): Promise<void> {
    const identifier = (input.identifier || '').trim();
    if (!identifier) {
      return;
    }

    const user = await this.userRepo.findByUsernameOrEmail(identifier);
    if (!user || !user.mail || user.mail.trim() === '') {
      return;
    }

    const alea = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    await this.userRepo.setPasswordResetToken(user.id, alea);
    await this.sendResetEmail(user, alea);
  }

  private async sendResetEmail(user: UserWithPassword, alea: string): Promise<void> {
    const siteUrl = this.mailer.siteUrl || '';
    const resetUrl = `${siteUrl}/reset-password?user=${user.id}&alea=${alea}`;

    const html = `
      <p>Bonjour ${user.username},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe sur JdRoll.</p>
      <p>Ce lien est valide pendant 30 minutes :</p>
      <p><a href="${resetUrl}">Renouveler mon mot de passe</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.</p>`;

    try {
      await this.mailer.sendEmail({
        to: user.mail,
        subject: 'Réinitialisation de votre mot de passe JdRoll',
        html,
        text: `Bonjour ${user.username},\n\nVous avez demandé la réinitialisation de votre mot de passe sur JdRoll.\nCe lien est valide pendant 30 minutes :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.`,
      });
    } catch (error) {
      console.error('[PasswordReset] Échec de lenvoi du mail de réinitialisation', { userId: user.id, error });
    }
  }
}

export const requestPasswordResetUseCase = new RequestPasswordResetUseCase();
