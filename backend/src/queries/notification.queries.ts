import { INotificationRepository, notificationRepository } from '../repositories/notification.repository.js';
import { NotificationItem } from '../types/index.js';
import { ValidationError } from '../errors/domain.errors.js';

export interface UserNotificationsResult {
  notifications: NotificationItem[];
  total: number;
}

export class NotificationQueries {
  constructor(private readonly notifRepo: INotificationRepository = notificationRepository) {}

  async getUserNotifications(userId: number): Promise<UserNotificationsResult> {
    if (!userId || userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur est invalide");
    }

    const notifications = await this.notifRepo.findByUserId(userId);
    return {
      notifications,
      total: notifications.length,
    };
  }
}

export const notificationQueries = new NotificationQueries();
