import { query, queryOne, execute } from '../db/mysql.js';
import { ChatMessage } from '../types/index.js';

export interface CreateChatMessageData {
  username: string;
  message: string;
  to?: string;
  to_username?: string;
}

export interface IChatRepository {
  createMessage(data: CreateChatMessageData): Promise<ChatMessage>;
  getRecentMessages(userId: number, username: string, limit?: number): Promise<ChatMessage[]>;
  getMessageById(id: number): Promise<ChatMessage | null>;
}

export class MysqlChatRepository implements IChatRepository {
  async createMessage(data: CreateChatMessageData): Promise<ChatMessage> {
    const to = data.to ?? '';
    const toUsername = data.to_username ?? '';

    const result = await execute(
      `INSERT INTO chat (username, message, \`to\`, to_username, time)
       VALUES (?, ?, ?, ?, NOW())`,
      [data.username, data.message, to, toUsername]
    );

    const message = await this.getMessageById(result.insertId);
    if (!message) {
      throw new Error(`Échec de récupération du message de tchat après insertion (id=${result.insertId})`);
    }

    return message;
  }

  async getRecentMessages(userId: number, username: string, limit: number = 200): Promise<ChatMessage[]> {
    const safeLimit = Math.min(Math.max(1, limit), 500);

    const rows = await query<{
      id: number;
      username: string;
      time: string;
      message: string;
      to: string | null;
      to_username: string | null;
      userAvatar: string | null;
      userProfil: number | null;
    }>(
      `SELECT 
         c.id,
         c.username,
         c.time,
         c.message,
         COALESCE(c.\`to\`, '') as \`to\`,
         COALESCE(c.to_username, '') as to_username,
         u.avatar as userAvatar,
         u.profil as userProfil
       FROM chat c
       LEFT JOIN user u ON u.username = c.username
       WHERE (c.\`to\` = '' OR c.\`to\` IS NULL OR c.\`to\` = '0')
          OR (c.username = ?)
          OR (c.\`to\` = ?)
          OR (c.to_username = ?)
       ORDER BY c.id DESC
       LIMIT ?`,
      [username, String(userId), username, safeLimit]
    );

    const mapped = rows.map((r) => ({
      id: r.id,
      username: r.username,
      userAvatar: r.userAvatar || null,
      userProfil: r.userProfil ?? 0,
      time: r.time,
      message: r.message,
      to: r.to ?? '',
      to_username: r.to_username ?? '',
    }));

    // Return in chronological order (oldest first)
    return mapped.reverse();
  }

  async getMessageById(id: number): Promise<ChatMessage | null> {
    const row = await queryOne<{
      id: number;
      username: string;
      time: string;
      message: string;
      to: string | null;
      to_username: string | null;
      userAvatar: string | null;
      userProfil: number | null;
    }>(
      `SELECT 
         c.id,
         c.username,
         c.time,
         c.message,
         COALESCE(c.\`to\`, '') as \`to\`,
         COALESCE(c.to_username, '') as to_username,
         u.avatar as userAvatar,
         u.profil as userProfil
       FROM chat c
       LEFT JOIN user u ON u.username = c.username
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      userAvatar: row.userAvatar || null,
      userProfil: row.userProfil ?? 0,
      time: row.time,
      message: row.message,
      to: row.to ?? '',
      to_username: row.to_username ?? '',
    };
  }
}

export const chatRepository: IChatRepository = new MysqlChatRepository();
