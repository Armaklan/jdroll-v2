import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import {
  INotificationWebSocketService,
  notificationWebSocketService,
} from '../../services/notification-websocket.service.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface DeleteAllNotificationsInput {
  userId: number;
}

export class DeleteAllNotificationsUseCase {
  constructor(
    private readonly notifRepo: INotificationRepository = notificationRepository,
    private readonly notifWsService: INotificationWebSocketService = notificationWebSocketService
  ) {}

  async execute(input: DeleteAllNotificationsInput): Promise<number> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur est invalide");
    }

    const count = await this.notifRepo.deleteAllByUserId(input.userId);
    this.notifWsService.sendNotificationsCleared(input.userId);
    return count;
  }
}

export const deleteAllNotificationsUseCase = new DeleteAllNotificationsUseCase();
