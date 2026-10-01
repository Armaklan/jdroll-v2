import { IChatRepository, chatRepository } from '../repositories/chat.repository.js';
import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { ChatMessage } from '../types/index.js';

// Un message est public si `to` est vide/marqueur legacy '0' ET `to_username` vide.
// Les MP legacy stockent un `to` vide avec `to_username` renseigné : ils ne sont
// visibles que par leur destinataire ou leur émetteur.
function isMessagePrivate(message: ChatMessage): boolean {
  return (message.to !== '' && message.to !== '0') || message.to_username !== '';
}

function isMessageVisibleToUser(message: ChatMessage, userId: number, username: string): boolean {
  if (!isMessagePrivate(message)) {
    return true;
  }
  return (
    message.username === username ||
    message.to === String(userId) ||
    message.to_username === username
  );
}

export class ChatQueries {
  constructor(
    private readonly chatRepo: IChatRepository = chatRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async getRecentMessages(userId: number, username: string, limit: number = 200): Promise<ChatMessage[]> {
    const messages = await this.chatRepo.getRecentMessages(userId, username, limit);
    // Les messages legacy du tchat ancien stockent `to = '0'` pour les messages publics
    return messages
      .map((m) => ({
        ...m,
        to: m.to === '0' ? '' : m.to,
        to_username: m.to === '0' && !m.to_username ? '' : m.to_username,
      }))
      .filter((m) => isMessageVisibleToUser(m, userId, username));
  }

  // Lecture publique pour les visiteurs non authentifiés : messages publics uniquement.
  async getPublicRecentMessages(limit: number = 200): Promise<ChatMessage[]> {
    const messages = await this.chatRepo.getRecentPublicMessages(limit);
    return messages
      .map((m) => ({
        ...m,
        to: m.to === '0' ? '' : m.to,
        to_username: m.to === '0' && !m.to_username ? '' : m.to_username,
      }))
      .filter((m) => !isMessagePrivate(m));
  }

  async searchUsers(query: string, currentUserId: number): Promise<{ id: number; username: string; avatar: string }[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.userRepo.searchByUsername(query.trim(), currentUserId);
  }
}

export const chatQueries = new ChatQueries();
