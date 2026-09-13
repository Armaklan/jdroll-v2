import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { md5 } from '../../utils/auth.js';
import { User } from '../../types/index.js';
import { UserAlreadyExistsError } from '../../errors/domain.errors.js';

export interface RegisterUserInput {
  username: string;
  mail: string;
  password: string;
  avatar?: string;
  description?: string;
  profil?: number;
  titre?: string;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.userRepo.existsByUsernameOrEmail(input.username, input.mail);
    if (existing) {
      throw new UserAlreadyExistsError('Cet identifiant ou email est déjà utilisé');
    }

    const passwordHash = md5(input.password);

    return this.userRepo.create({
      username: input.username,
      mail: input.mail,
      passwordHash,
      avatar: input.avatar ?? '',
      description: input.description ?? '',
      profil: input.profil ?? 0,
      titre: input.titre ?? '',
    });
  }
}

export const registerUserUseCase = new RegisterUserUseCase();
