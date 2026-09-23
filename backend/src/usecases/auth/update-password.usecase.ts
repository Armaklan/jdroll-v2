import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { UserNotFoundError, InvalidCredentialsError } from '../../errors/domain.errors.js';
import { md5 } from '../../utils/auth.js';

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class UpdatePasswordUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(userId: number, input: UpdatePasswordInput): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }

    // We need to get the user with password to verify
    const userWithPassword = await this.userRepo.findByUsernameOrEmail(user.username);
    if (!userWithPassword || !userWithPassword.password) {
      throw new InvalidCredentialsError('Mot de passe actuel incorrect');
    }

    if (userWithPassword.password !== md5(input.currentPassword)) {
      throw new InvalidCredentialsError('Mot de passe actuel incorrect');
    }

    await this.userRepo.updatePassword(userId, md5(input.currentPassword), md5(input.newPassword));
  }
}

const updatePasswordUseCase = new UpdatePasswordUseCase();
export { updatePasswordUseCase };
