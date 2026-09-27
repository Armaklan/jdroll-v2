import { IChatRepository, chatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ForbiddenError } from '../../errors/domain.errors.js';

export interface ClearChatDTO {
  userId: number;
  userProfil?: number;
}

export interface ClearChatResult {
  success: boolean;
  deletedCount: number;
}

export class ClearChatUseCase {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(dto: ClearChatDTO): Promise<ClearChatResult> {
    let profil = dto.userProfil;
    if (profil === undefined) {
      const user = await this.userRepo.findById(dto.userId);
      profil = user?.profil ?? 0;
    }

    const isAdmin = profil === 2;
    if (!isAdmin) {
      throw new ForbiddenError('Seul un administrateur peut vider le tchat');
    }

    const deletedCount = await this.chatRepo.deleteAllMessages();

    return {
      success: true,
      deletedCount,
    };
  }
}

export const clearChatUseCase = new ClearChatUseCase();
