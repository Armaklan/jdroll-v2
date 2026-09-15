import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface DeleteAllNotificationsInput {
  userId: number;
}

export class DeleteAllNotificationsUseCase {
  constructor(private readonly notifRepo: INotificationRepository = notificationRepository) {}

  async execute(input: DeleteAllNotificationsInput): Promise<number> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur est invalide");
    }

    return this.notifRepo.deleteAllByUserId(input.userId);
  }
}

export const deleteAllNotificationsUseCase = new DeleteAllNotificationsUseCase();
