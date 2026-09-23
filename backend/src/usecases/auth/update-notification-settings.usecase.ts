import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { NotificationSettings, User } from '../../types/index.js';
import { UserNotFoundError } from '../../errors/domain.errors.js';

export class UpdateNotificationSettingsUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(userId: number, settings: NotificationSettings): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }

    return this.userRepo.updateNotificationSettings(userId, settings);
  }
}

const updateNotificationSettingsUseCase = new UpdateNotificationSettingsUseCase();
export { updateNotificationSettingsUseCase };
