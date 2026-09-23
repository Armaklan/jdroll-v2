import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { UpdateUserProfileData, User } from '../../types/index.js';
import { UserNotFoundError } from '../../errors/domain.errors.js';

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(userId: number, data: UpdateUserProfileData): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }

    return this.userRepo.updateProfile(userId, data);
  }
}

export const updateUserProfileUseCase = new UpdateUserProfileUseCase();
