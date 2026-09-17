import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import {
  INotificationWebSocketService,
  notificationWebSocketService,
} from '../../services/notification-websocket.service.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface DeleteNotificationInput {
  notificationId: number;
  userId: number;
}

export class DeleteNotificationUseCase {
  constructor(
    private readonly notifRepo: INotificationRepository = notificationRepository,
    private readonly notifWsService: INotificationWebSocketService = notificationWebSocketService
  ) {}

  async execute(input: DeleteNotificationInput): Promise<boolean> {
    if (!input.notificationId || input.notificationId <= 0) {
      throw new ValidationError("L'identifiant de la notification est invalide");
    }
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur est invalide");
    }

    const deleted = await this.notifRepo.deleteNotification(input.notificationId, input.userId);
    if (deleted) {
      this.notifWsService.sendNotificationDeleted(input.userId, input.notificationId);
    }
    return deleted;
  }
}

export const deleteNotificationUseCase = new DeleteNotificationUseCase();
