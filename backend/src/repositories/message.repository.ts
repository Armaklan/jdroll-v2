import { query, queryOne, execute } from '../db/mysql.js';
import {
  InboxMessageSummary,
  SentMessageSummary,
  MessageDetail,
  MessageRecipient,
} from '../types/index.js';

export interface IMessageRepository {
  createMessage(
    fromId: number,
    fromUsername: string,
    title: string,
    content: string,
    recipients: { id: number; username: string }[]
  ): Promise<number>;
  getInbox(userId: number): Promise<InboxMessageSummary[]>;
  getSent(userId: number): Promise<SentMessageSummary[]>;
  getMessageById(messageId: number): Promise<MessageDetail | null>;
  getMessageRecipients(messageId: number): Promise<MessageRecipient[]>;
  isUserRecipient(messageId: number, userId: number): Promise<boolean>;
  isUserSender(messageId: number, userId: number): Promise<boolean>;
  getRecipientStatut(messageId: number, userId: number): Promise<number | null>;
  markAsRead(messageId: number, userId: number): Promise<void>;
  deleteFromInbox(messageId: number, userId: number): Promise<boolean>;
  deleteFromSent(messageId: number, userId: number): Promise<boolean>;
  getUnreadCount(userId: number): Promise<number>;
}

export class MysqlMessageRepository implements IMessageRepository {
  async createMessage(
    fromId: number,
    fromUsername: string,
    title: string,
    content: string,
    recipients: { id: number; username: string }[]
  ): Promise<number> {
    const result = await execute(
      `INSERT INTO messages (from_id, from_username, title, content, time, statut)
       VALUES (?, ?, ?, ?, NOW(), 0)`,
      [fromId, fromUsername, title, content]
    );
    const messageId = result.insertId;

    for (const recipient of recipients) {
      await execute(
        `INSERT INTO messages_to (id_message, to_id, to_username, statut)
         VALUES (?, ?, ?, 0)`,
        [messageId, recipient.id, recipient.username]
      );
    }

    return messageId;
  }

  async getInbox(userId: number): Promise<InboxMessageSummary[]> {
    const rows = await query<{
      id: number;
      fromId: number;
      fromUsername: string;
      fromAvatar: string | null;
      title: string;
      time: string;
      statut: number;
    }>(
      `SELECT m.id, m.from_id AS fromId, m.from_username AS fromUsername, u.avatar AS fromAvatar,
              m.title, m.time, mt.statut
       FROM messages_to mt
       JOIN messages m ON m.id = mt.id_message
       LEFT JOIN user u ON u.id = m.from_id
       WHERE mt.to_id = ? AND mt.statut != 2
       ORDER BY m.time DESC, m.id DESC`,
      [userId]
    );

    if (rows.length === 0) {
      return [];
    }

    const messageIds = rows.map((r) => r.id);
    const recipientsByMessageId = await this.fetchRecipientsForMessageIds(messageIds);

    return rows.map((row) => ({
      id: row.id,
      fromId: row.fromId,
      fromUsername: row.fromUsername,
      fromAvatar: row.fromAvatar,
      title: row.title,
      time: row.time,
      statut: row.statut,
      isRead: row.statut === 1,
      recipients: recipientsByMessageId.get(row.id) || [],
    }));
  }

  async getSent(userId: number): Promise<SentMessageSummary[]> {
    const rows = await query<{
      id: number;
      fromId: number;
      fromUsername: string;
      title: string;
      time: string;
      statut: number;
    }>(
      `SELECT m.id, m.from_id AS fromId, m.from_username AS fromUsername, m.title, m.time, m.statut
       FROM messages m
       WHERE m.from_id = ? AND m.statut = 0
       ORDER BY m.time DESC, m.id DESC`,
      [userId]
    );

    if (rows.length === 0) {
      return [];
    }

    const messageIds = rows.map((r) => r.id);
    const recipientsByMessageId = await this.fetchRecipientsForMessageIds(messageIds);

    return rows.map((row) => {
      const recipients = recipientsByMessageId.get(row.id) || [];
      const isRead = recipients.length > 0 && recipients.every((r) => r.statut >= 1);
      return {
        id: row.id,
        fromId: row.fromId,
        fromUsername: row.fromUsername,
        title: row.title,
        time: row.time,
        statut: row.statut,
        recipients,
        isRead,
      };
    });
  }

  private async fetchRecipientsForMessageIds(
    messageIds: number[]
  ): Promise<Map<number, MessageRecipient[]>> {
    const map = new Map<number, MessageRecipient[]>();
    if (messageIds.length === 0) return map;

    const placeholders = messageIds.map(() => '?').join(',');
    const rows = await query<{
      idMessage: number;
      id: number;
      username: string;
      statut: number;
      avatar: string | null;
    }>(
      `SELECT mt.id_message AS idMessage, mt.to_id AS id, mt.to_username AS username, mt.statut, u.avatar
       FROM messages_to mt
       LEFT JOIN user u ON u.id = mt.to_id
       WHERE mt.id_message IN (${placeholders})`,
      messageIds
    );

    for (const r of rows) {
      const list = map.get(r.idMessage) || [];
      list.push({
        id: r.id,
        username: r.username,
        avatar: r.avatar,
        statut: r.statut,
        isRead: r.statut >= 1,
      });
      map.set(r.idMessage, list);
    }

    return map;
  }

  async getMessageById(messageId: number): Promise<MessageDetail | null> {
    const row = await queryOne<{
      id: number;
      fromId: number;
      fromUsername: string;
      fromAvatar: string | null;
      title: string;
      content: string;
      time: string;
      statut: number;
    }>(
      `SELECT m.id, m.from_id AS fromId, m.from_username AS fromUsername, u.avatar AS fromAvatar,
              m.title, m.content, m.time, m.statut
       FROM messages m
       LEFT JOIN user u ON u.id = m.from_id
       WHERE m.id = ?
       LIMIT 1`,
      [messageId]
    );

    if (!row) {
      return null;
    }

    const recipients = await this.getMessageRecipients(messageId);

    return {
      id: row.id,
      fromId: row.fromId,
      fromUsername: row.fromUsername,
      fromAvatar: row.fromAvatar,
      title: row.title,
      content: row.content,
      time: row.time,
      statut: row.statut,
      recipients,
      isSender: false,
      isRead: false,
    };
  }

  async getMessageRecipients(messageId: number): Promise<MessageRecipient[]> {
    const rows = await query<{
      id: number;
      username: string;
      statut: number;
      avatar: string | null;
    }>(
      `SELECT mt.to_id AS id, mt.to_username AS username, mt.statut, u.avatar
       FROM messages_to mt
       LEFT JOIN user u ON u.id = mt.to_id
       WHERE mt.id_message = ?`,
      [messageId]
    );

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      avatar: r.avatar,
      statut: r.statut,
      isRead: r.statut >= 1,
    }));
  }

  async isUserRecipient(messageId: number, userId: number): Promise<boolean> {
    const row = await queryOne<{ to_id: number }>(
      `SELECT to_id FROM messages_to WHERE id_message = ? AND to_id = ? LIMIT 1`,
      [messageId, userId]
    );
    return Boolean(row);
  }

  async isUserSender(messageId: number, userId: number): Promise<boolean> {
    const row = await queryOne<{ id: number }>(
      `SELECT id FROM messages WHERE id = ? AND from_id = ? LIMIT 1`,
      [messageId, userId]
    );
    return Boolean(row);
  }

  async getRecipientStatut(messageId: number, userId: number): Promise<number | null> {
    const row = await queryOne<{ statut: number }>(
      `SELECT statut FROM messages_to WHERE id_message = ? AND to_id = ? LIMIT 1`,
      [messageId, userId]
    );
    return row !== null ? row.statut : null;
  }

  async markAsRead(messageId: number, userId: number): Promise<void> {
    await execute(
      `UPDATE messages_to SET statut = 1 WHERE id_message = ? AND to_id = ? AND statut = 0`,
      [messageId, userId]
    );
  }

  async deleteFromInbox(messageId: number, userId: number): Promise<boolean> {
    const result = await execute(
      `UPDATE messages_to SET statut = 2 WHERE id_message = ? AND to_id = ?`,
      [messageId, userId]
    );
    return result.affectedRows > 0;
  }

  async deleteFromSent(messageId: number, userId: number): Promise<boolean> {
    const result = await execute(
      `UPDATE messages SET statut = 1 WHERE id = ? AND from_id = ?`,
      [messageId, userId]
    );
    return result.affectedRows > 0;
  }

  async getUnreadCount(userId: number): Promise<number> {
    const row = await queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM messages_to WHERE to_id = ? AND statut = 0`,
      [userId]
    );
    return row ? Number(row.total) : 0;
  }
}

export const messageRepository: IMessageRepository = new MysqlMessageRepository();
