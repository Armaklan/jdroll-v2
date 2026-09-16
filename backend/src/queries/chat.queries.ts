import { IChatRepository, chatRepository } from '../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { ChatMessage } from '../types/index.js';

export class ChatQueries {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async getRecentMessages(userId: number, username: string, limit: number = 200): Promise<ChatMessage[]> {
    return this.chatRepo.getRecentMessages(userId, username, limit);
  }

  async searchUsers(query: string, currentUserId: number): Promise<{ id: number; username: string; avatar: string }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.userRepo.searchByUsername(query.trim(), currentUserId);
  }
}

export const chatQueries = new ChatQueries();
