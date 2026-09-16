import { IMessageRepository, messageRepository } from '../../repositories/message.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface MarkMessageReadInput {
  messageId: number;
  userId: number;
}

export class MarkMessageReadUseCase {
  constructor(private readonly messageRepo: IMessageRepository = messageRepository) {}

  async execute(input: MarkMessageReadInput): Promise<void> {
    if (!input.messageId || input.messageId <= 0) {
      throw new ValidationError('Identifiant du message invalide');
    }
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError('Identifiant utilisateur invalide');
    }

    await this.messageRepo.markAsRead(input.messageId, input.userId);
  }
}

export const markMessageReadUseCase = new MarkMessageReadUseCase();
