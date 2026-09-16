import { IMessageRepository, messageRepository } from '../../repositories/message.repository.js';
import { ValidationError, ForbiddenError } from '../../errors/domain.errors.js';

export interface DeleteMessageInput {
  messageId: number;
  userId: number;
  box: 'inbox' | 'sent';
}

export class DeleteMessageUseCase {
  constructor(private readonly messageRepo: IMessageRepository = messageRepository) {}

  async execute(input: DeleteMessageInput): Promise<boolean> {
    if (!input.messageId || input.messageId <= 0) {
      throw new ValidationError('Identifiant du message invalide');
    }
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError('Identifiant utilisateur invalide');
    }

    if (input.box === 'inbox') {
      const isRecipient = await this.messageRepo.isUserRecipient(input.messageId, input.userId);
      if (!isRecipient) {
        throw new ForbiddenError("Vous n'êtes pas destinataire de ce message");
      }
      return this.messageRepo.deleteFromInbox(input.messageId, input.userId);
    } else if (input.box === 'sent') {
      const isSender = await this.messageRepo.isUserSender(input.messageId, input.userId);
      if (!isSender) {
        throw new ForbiddenError("Vous n'êtes pas l'expéditeur de ce message");
      }
      return this.messageRepo.deleteFromSent(input.messageId, input.userId);
    } else {
      throw new ValidationError('Type de boîte invalide (doit être inbox ou sent)');
    }
  }
}

export const deleteMessageUseCase = new DeleteMessageUseCase();
