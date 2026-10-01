import { INotificationRepository, notificationRepository } from '../../repositories/notification.repository.js';
import {
  INotificationWebSocketService,
  notificationWebSocketService,
} from '../../services/notification-websocket.service.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { IMailerService, mailerService } from '../../services/mailer.service.js';
import { renderEmailTemplate } from '../../services/email-template.js';
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
  'chat': 'notif_chat',
  'topic': 'notif_message',
  'dice': 'notif_message',
  'perso': 'notif_perso',
  'campaign': 'notif_inscription',
};

const MAIL_TYPE_TO_SETTING: Record<string, keyof User> = {
  'mp': 'mail_mp',
  'chat': 'mail_chat',
  'topic': 'mail_message',
  'dice': 'mail_message',
  'perso': 'mail_perso',
  'campaign': 'mail_inscription',
};

/**
 * Horodatage local au format DB ("YYYY-MM-DD HH:mm:ss"), sans suffixe UTC,
 * pour rester cohérent avec les dates MySQL lues via dateStrings: true.
 */
function localNowForDb(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export class CreateOrUpdateNotificationUseCase {
  constructor(
    private readonly notifRepo: INotificationRepository = notificationRepository,
    private readonly notifWsService: INotificationWebSocketService = notificationWebSocketService,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly mailer: IMailerService = mailerService
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
    const inAppEnabled = !settingKey || (user[settingKey] as number) !== 0;

    let notification: NotificationItem | null = null;

    if (inAppEnabled) {
      const existing = await this.notifRepo.findNotification(input.userId, trimmedType, input.targetId);

      if (existing) {
        await this.notifRepo.updateNotification(existing.id, {
          nbIncrement: true,
        });
        notification = {
          ...existing,
          nb: existing.nb + 1,
          lastUpdate: localNowForDb(),
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
          lastUpdate: localNowForDb(),
        };
      }

      this.notifWsService.sendNotification(input.userId, notification);
    }

    await this.sendEmailEquivalent(user, {
      title: trimmedTitle,
      content: trimmedContent,
      url: trimmedUrl,
      type: trimmedType,
    });

    return notification;
  }

  private async sendEmailEquivalent(
    user: User,
    notification: Pick<NotificationItem, 'title' | 'content' | 'url' | 'type'>
  ): Promise<void> {
    const mailSettingKey = MAIL_TYPE_TO_SETTING[notification.type];
    if (!mailSettingKey || (user[mailSettingKey] as number) !== 1 || !user.mail || user.mail.trim() === '') {
      return;
    }

    const siteUrl = this.mailer.siteUrl;
    const ctaUrl = siteUrl && notification.url ? `${siteUrl}${notification.url}` : null;

    const html = renderEmailTemplate({
      title: notification.title,
      bodyHtml: notification.content,
      ctaUrl: ctaUrl ?? undefined,
      ctaLabel: 'Voir sur le site',
    });

    try {
      await this.mailer.sendEmail({
        to: user.mail,
        subject: notification.title,
        html,
      });
    } catch (error) {
      console.error('[Notification] Échec de la notification par email', { userId: user.id, error });
    }
  }
}

export const createOrUpdateNotificationUseCase = new CreateOrUpdateNotificationUseCase();
