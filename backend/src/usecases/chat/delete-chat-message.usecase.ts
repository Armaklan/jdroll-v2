import { IChatRepository, chatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ForbiddenError, MessageNotFoundError } from '../../errors/domain.errors.js';

export interface DeleteChatMessageDTO {
  messageId: number;
  userId: number;
  userProfil?: number;
}

export interface DeleteChatMessageResult {
  success: boolean;
  deletedMessageId: number;
}

export class DeleteChatMessageUseCase {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(dto: DeleteChatMessageDTO): Promise<DeleteChatMessageResult> {
    const message = await this.chatRepo.getMessageById(dto.messageId);
    if (!message) {
      throw new MessageNotFoundError(`Le message de tchat avec l'identifiant ${dto.messageId} n'existe pas`);
    }

    let profil = dto.userProfil;
    if (profil === undefined) {
      const user = await this.userRepo.findById(dto.userId);
      profil = user?.profil ?? 0;
    }

    const isAdmin = profil === 2;
    if (!isAdmin) {
      throw new ForbiddenError('Seul un administrateur peut supprimer un message du tchat');
    }

    await this.chatRepo.deleteMessage(dto.messageId);

    return {
      success: true,
      deletedMessageId: dto.messageId,
    };
  }
}

export const deleteChatMessageUseCase = new DeleteChatMessageUseCase();
