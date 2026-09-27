import { IUserPasswordResetRepository, userRepository } from '../../repositories/user.repository.js';
import { InvalidPasswordResetTokenError, ExpiredPasswordResetTokenError } from '../../errors/domain.errors.js';
import { md5 } from '../../utils/auth.js';

export interface ResetPasswordInput {
  userId: number;
  alea: string;
  newPassword: string;
}

export const RESET_TOKEN_VALIDITY_MS = 30 * 60 * 1000;

export class ResetPasswordUseCase {
  constructor(private readonly userRepo: IUserPasswordResetRepository = userRepository) {}

  /**
   * Définit un nouveau mot de passe à partir du token reçu par mail.
   * Le token doit correspondre à reinitAlea et avoir été généré il y a moins de 30 minutes.
   */
  async execute(input: ResetPasswordInput): Promise<void> {
    const token = await this.userRepo.findPasswordResetToken(input.userId);
    if (!token || token.reinitAlea !== input.alea) {
      throw new InvalidPasswordResetTokenError();
    }

    const requestedAt = new Date(token.reinitDate).getTime();
    if (Number.isNaN(requestedAt) || Date.now() - requestedAt > RESET_TOKEN_VALIDITY_MS) {
      throw new ExpiredPasswordResetTokenError();
    }

    await this.userRepo.resetPasswordWithToken(input.userId, input.alea, md5(input.newPassword));
  }
}

export const resetPasswordUseCase = new ResetPasswordUseCase();
