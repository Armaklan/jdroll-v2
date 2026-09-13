import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { verifyPasswordMD5 } from '../../utils/auth.js';
import { User } from '../../types/index.js';
import { InvalidCredentialsError } from '../../errors/domain.errors.js';

export interface LoginUserInput {
  username: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(input: LoginUserInput): Promise<User> {
    const userWithPassword = await this.userRepo.findByUsernameOrEmail(input.username);
    if (!userWithPassword || !userWithPassword.password) {
      throw new InvalidCredentialsError('Identifiant ou mot de passe incorrect');
    }

    const isValid = verifyPasswordMD5(input.password, userWithPassword.password);
    if (!isValid) {
      throw new InvalidCredentialsError('Identifiant ou mot de passe incorrect');
    }

    const { password: _, ...user } = userWithPassword;
    return user;
  }
}

export const loginUserUseCase = new LoginUserUseCase();
