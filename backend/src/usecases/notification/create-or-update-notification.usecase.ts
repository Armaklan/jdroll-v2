import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface CreateOrUpdateNotificationInput {
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
}

export class CreateOrUpdateNotificationUseCase {
  constructor(private readonly notifRepo: INotificationRepository = notificationRepository) {}

  async execute(input: CreateOrUpdateNotificationInput): Promise<void> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError("L'identifiant de l'utilisateur destinataire est invalide");
    }

    const trimmedTitle = (input.title || '').trim().slice(0, 500);
    const trimmedContent = (input.content || '').trim();
    const trimmedUrl = (input.url || '').trim().slice(0, 500);
    const trimmedType = (input.type || '').trim().slice(0, 10);

    const existing = await this.notifRepo.findNotification(input.userId, trimmedType, input.targetId);

    if (existing) {
      await this.notifRepo.updateNotification(existing.id, {
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
        nbIncrement: true,
      });
    } else {
      await this.notifRepo.createNotification({
        userId: input.userId,
        title: trimmedTitle,
        content: trimmedContent,
        url: trimmedUrl,
        type: trimmedType,
        targetId: input.targetId,
      });
    }
  }
}

export const createOrUpdateNotificationUseCase = new CreateOrUpdateNotificationUseCase();
