import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import {
  INotificationWebSocketService,
  notificationWebSocketService,
} from '../../services/notification-websocket.service.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { NotificationItem } from '../../types/index.js';

export interface CreateOrUpdateNotificationInput {
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
}

export class CreateOrUpdateNotificationUseCase {
  constructor(
    private readonly notifRepo: INotificationRepository = notificationRepository,
    private readonly notifWsService: INotificationWebSocketService = notificationWebSocketService
  ) {}

  async execute(input: CreateOrUpdateNotificationInput): Promise<NotificationItem> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur destinataire est invalide");
    }

    const trimmedTitle = (input.title || '').trim().slice(0, 500);
    const trimmedContent = (input.content || '').trim();
    const trimmedUrl = (input.url || '').trim().slice(0, 500);
    const trimmedType = (input.type || '').trim().slice(0, 10);

    const existing = await this.notifRepo.findNotification(input.userId, trimmedType, input.targetId);

    let notification: NotificationItem;

    if (existing) {
      await this.notifRepo.updateNotification(existing.id, {
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
        nbIncrement: true,
      });
      notification = {
        ...existing,
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
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
