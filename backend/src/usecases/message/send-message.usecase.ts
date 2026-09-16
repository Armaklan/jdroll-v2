import { IMessageRepository, messageRepository } from '../../repositories/message.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CreateOrUpdateNotificationUseCase,
  createOrUpdateNotificationUseCase,
} from '../notification/create-or-update-notification.usecase.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface SendMessageInput {
  fromId: number;
  fromUsername: string;
  title: string;
  content: string;
  recipients: string[]; // usernames
}

export interface SendMessageResult {
  messageId: number;
  recipientsCount: number;
}

export class SendMessageUseCase {
  constructor(
    private readonly messageRepo: IMessageRepository = messageRepository,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly notifUseCase: CreateOrUpdateNotificationUseCase = createOrUpdateNotificationUseCase
  ) {}

  async execute(input: SendMessageInput): Promise<SendMessageResult> {
    const trimmedTitle = (input.title || '').trim();
    if (!trimmedTitle) {
      throw new ValidationError('Le sujet du message est obligatoire');
    }
    if (trimmedTitle.length > 200) {
      throw new ValidationError('Le sujet ne peut pas dépasser 200 caractères');
    }

    const trimmedContent = (input.content || '').trim();
    if (!trimmedContent) {
      throw new ValidationError('Le contenu du message ne peut pas être vide');
    }

    const recipientUsernames = (input.recipients || [])
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (recipientUsernames.length === 0) {
      throw new ValidationError('Vous devez spécifier au moins un destinataire');
    }

    // Deduplicate usernames
    const uniqueUsernamesMap = new Map<string, string>();
    for (const name of recipientUsernames) {
      if (!uniqueUsernamesMap.has(name.toLowerCase())) {
        uniqueUsernamesMap.set(name.toLowerCase(), name);
      }
    }

    const foundUsers = await this.userRepo.findByUsernames(recipientUsernames);

    if (foundUsers.length === 0) {
      throw new ValidationError('Aucun destinataire valide trouvé');
    }

    const foundUsernamesLower = new Set(foundUsers.map((u) => u.username.toLowerCase()));
    const missing: string[] = [];
    for (const [lower, original] of uniqueUsernamesMap.entries()) {
      if (!foundUsernamesLower.has(lower)) {
        missing.push(original);
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(
        `Destinataire(s) introuvable(s) : ${missing.join(', ')}`
      );
    }

    // Prepare recipients list
    const recipientsList = foundUsers.map((u) => ({
      id: u.id,
      username: u.username,
    }));

    const messageId = await this.messageRepo.createMessage(
      input.fromId,
      input.fromUsername,
      trimmedTitle,
      trimmedContent,
      recipientsList
    );

    // Send notifications to recipients (except if sending to oneself)
    for (const recipient of recipientsList) {
      if (recipient.id !== input.fromId) {
        try {
          await this.notifUseCase.execute({
            userId: recipient.id,
            title: 'Nouveau message privé',
            content: `Message privé reçu de <strong>${input.fromUsername}</strong> : ${trimmedTitle}`,
            url: `/messages?id=${messageId}`,
            type: 'mp',
            targetId: messageId,
          });
        } catch {
          // Non-blocking notification failure
        }
      }
    }

    return {
      messageId,
      recipientsCount: recipientsList.length,
    };
  }
}

export const sendMessageUseCase = new SendMessageUseCase();
