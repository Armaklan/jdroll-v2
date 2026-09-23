import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import {
  INotificationWebSocketService,
  notificationWebSocketService,
} from '../../services/notification-websocket.service.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { NotificationItem, User } from '../../types/index.js';

export interface CreateOrUpdateNotificationInput {
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
}

const NOTIFICATION_TYPE_TO_SETTING: Record<string, keyof User> = {
  'mp': 'notif_mp',
  'chat': 'notif_mp',
  'topic': 'notif_message',
  'dice': 'notif_message',
  'perso': 'notif_perso',
  'campaign': 'notif_inscription',
};

export class CreateOrUpdateNotificationUseCase {
  constructor(
    private readonly notifRepo: INotificationRepository = notificationRepository,
    private readonly notifWsService: INotificationWebSocketService = notificationWebSocketService,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: CreateOrUpdateNotificationInput): Promise<NotificationItem | null> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur destinataire est invalide");
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new ValidationError("L'utilisateur destinataire n'existe pas");
    }

    const trimmedTitle = (input.title || '').trim().slice(0, 500);
    const trimmedContent = (input.content || '').trim();
    const trimmedUrl = (input.url || '').trim().slice(0, 500);
    const trimmedType = (input.type || '').trim().slice(0, 10);

    const settingKey = NOTIFICATION_TYPE_TO_SETTING[trimmedType];
    if (settingKey && (user[settingKey] as number) === 0) {
      return null;
    }

    const existing = await this.notifRepo.findNotification(input.userId, trimmedType, input.targetId);

    let notification: NotificationItem;

    if (existing) {
      await this.notifRepo.updateNotification(existing.id, {
        nbIncrement: true,
      });
      notification = {
        ...existing,
        nb: existing.nb + 1,
        lastUpdate: new Date().toISOString(),
      };
    } else {
      const createdId = await this.notifRepo.createNotification({
        userId: input.userId,
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
        type: trimmedType,
        targetId: input.targetId,
      });
      notification = {
        id: createdId,
        userId: input.userId,
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
        type: trimmedType,
        targetId: input.targetId,
        nb: 1,
        lastUpdate: new Date().toISOString(),
      };
    }

    this.notifWsService.sendNotification(input.userId, notification);

    return notification;
  }
}

export const createOrUpdateNotificationUseCase = new CreateOrUpdateNotificationUseCase();
