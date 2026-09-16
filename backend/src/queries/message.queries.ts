import { IMessageRepository, messageRepository } from '../repositories/message.repository.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import {
  MarkMessageReadUseCase,
  markMessageReadUseCase,
} from '../usecases/message/mark-message-read.usecase.js';
import {
  InboxMessageSummary,
  SentMessageSummary,
  MessageDetail,
} from '../types/index.js';
import { MessageNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

export class MessageQueries {
  constructor(
    private readonly messageRepo: IMessageRepository = messageRepository,
    private readonly userRepo: IUserRepository = userRepository,
    private readonly markReadUseCase: MarkMessageReadUseCase = markMessageReadUseCase
  ) {}

  async getInbox(userId: number): Promise<{
    messages: InboxMessageSummary[];
    unreadCount: number;
  }> {
    const [messages, unreadCount] = await Promise.all([
      this.messageRepo.getInbox(userId),
      this.messageRepo.getUnreadCount(userId),
    ]);

    return {
      messages,
      unreadCount,
    };
  }

  async getSent(userId: number): Promise<{
    messages: SentMessageSummary[];
  }> {
    const messages = await this.messageRepo.getSent(userId);
    return {
      messages,
    };
  }

  async getMessageDetail(messageId: number, userId: number): Promise<MessageDetail> {
    const message = await this.messageRepo.getMessageById(messageId);
    if (!message) {
      throw new MessageNotFoundError('Message introuvable');
    }

    const isSender = message.fromId === userId;
    const recipient = message.recipients.find((r) => r.id === userId);
    const isRecipient = Boolean(recipient);

    if (!isSender && !isRecipient) {
      throw new ForbiddenError("Vous n'avez pas accès à ce message");
    }

    message.isSender = isSender;

    if (isRecipient && recipient) {
      if (recipient.statut === 0) {
        await this.markReadUseCase.execute({ messageId, userId });
        recipient.statut = 1;
        recipient.isRead = true;
      }
      message.statut = recipient.statut;
      message.isRead = true;
    } else if (isSender) {
      message.isRead =
        message.recipients.length > 0 &&
        message.recipients.every((r) => r.statut >= 1);
    }

    return message;
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.messageRepo.getUnreadCount(userId);
  }

  async searchUsers(
    query: string,
    currentUserId: number
  ): Promise<{ id: number; username: string; avatar: string }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.userRepo.searchByUsername(query.trim(), currentUserId);
  }
}

export const messageQueries = new MessageQueries();
