import { IChatRepository, chatRepository } from '../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { ChatMessage } from '../types/index.js';

export class ChatQueries {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async getRecentMessages(userId: number, username: string, limit: number = 200): Promise<ChatMessage[]> {
    const messages = await this.chatRepo.getRecentMessages(userId, username, limit);
    // Les messages legacy du tchat ancien stockent `to = '0'` pour les messages publics
    return messages.map((m) => ({
      ...m,
      to: m.to === '0' ? '' : m.to,
      to_username: m.to === '0' && !m.to_username ? '' : m.to_username,
    }));
  }

  async searchUsers(query: string, currentUserId: number): Promise<{ id: number; username: string; avatar: string }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.userRepo.searchByUsername(query.trim(), currentUserId);
  }
}

export const chatQueries = new ChatQueries();
