import { IChatRepository, chatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ChatMessage, SendChatMessageInput } from '../../types/index.js';
import { ValidationError, UserNotFoundError } from '../../errors/domain.errors.js';

export class SendChatMessageUseCase {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: SendChatMessageInput): Promise<ChatMessage> {
    const trimmedMessage = input.message ? input.message.trim() : '';
    if (!trimmedMessage) {
      throw new ValidationError('Le message ne peut pas être vide');
    }

    let targetTo = (input.to ?? '').trim();
    let targetToUsername = (input.to_username ?? '').trim();

    // If private message is specified
    if (targetTo || targetToUsername) {
      if (targetTo && !targetToUsername) {
        const recipientUser = await this.userRepo.findById(Number(targetTo));
        if (!recipientUser) {
          throw new UserNotFoundError('Destinataire introuvable');
        }
        targetToUsername = recipientUser.username;
      } else if (!targetTo && targetToUsername) {
        const recipientUser = await this.userRepo.findByUsernameOrEmail(targetToUsername);
        if (!recipientUser) {
          throw new UserNotFoundError('Destinataire introuvable');
        }
        targetTo = String(recipientUser.id);
        targetToUsername = recipientUser.username;
      }
    }

    return this.chatRepo.createMessage({
      username: input.username,
      message: trimmedMessage,
      to: targetTo,
      to_username: targetToUsername,
    });
  }
}

export const sendChatMessageUseCase = new SendChatMessageUseCase();
