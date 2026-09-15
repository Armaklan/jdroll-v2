import { query, queryOne, execute } from '../db/mysql.js';
import { NotificationItem, RawNotificationRow } from '../types/index.js';

export interface CreateNotificationData {
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
}

export interface UpdateNotificationData {
  title?: string;
  content?: string;
  url?: string;
  nbIncrement?: boolean;
}

export interface INotificationRepository {
  findByUserId(userId: number): Promise<NotificationItem[]>;
  countByUserId(userId: number): Promise<number>;
  findNotification(userId: number, type: string, targetId: number): Promise<NotificationItem | null>;
  createNotification(data: CreateNotificationData): Promise<number>;
  updateNotification(id: number, data: UpdateNotificationData): Promise<void>;
  deleteNotification(id: number, userId: number): Promise<boolean>;
  deleteAllByUserId(userId: number): Promise<number>;
}

export class MysqlNotificationRepository implements INotificationRepository {
  private mapRowToEntity(row: RawNotificationRow): NotificationItem {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      url: row.url || '',
      type: row.type || '',
      targetId: Number(row.target_id || 0),
      nb: Number(row.nb || 1),
      lastUpdate: row.last_update ? new Date(row.last_update).toISOString() : new Date().toISOString(),
    };
  }

  async findByUserId(userId: number): Promise<NotificationItem[]> {
    const sql = `
      SELECT id, user_id, title, content, url, type, target_id, nb, last_update
      FROM notif
      WHERE user_id = ?
      ORDER BY last_update DESC, id DESC
    `;
    const rows = await query<RawNotificationRow>(sql, [userId]);
    return rows.map((r) => this.mapRowToEntity(r));
  }

  async countByUserId(userId: number): Promise<number> {
    const sql = `SELECT COUNT(*) AS total FROM notif WHERE user_id = ?`;
    const row = await queryOne<{ total: number }>(sql, [userId]);
    return Number(row?.total || 0);
  }

  async findNotification(userId: number, type: string, targetId: number): Promise<NotificationItem | null> {
    const sql = `
      SELECT id, user_id, title, content, url, type, target_id, nb, last_update
      FROM notif
      WHERE user_id = ? AND type = ? AND target_id = ?
      LIMIT 1
    `;
    const row = await queryOne<RawNotificationRow>(sql, [userId, type, targetId]);
    return row ? this.mapRowToEntity(row) : null;
  }

  async createNotification(data: CreateNotificationData): Promise<number> {
    const sql = `
      INSERT INTO notif (user_id, title, content, url, type, target_id, nb, last_update)
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    `;
    const result = await execute(sql, [
      data.userId,
      data.title,
      data.content,
      data.url,
      data.type,
      data.targetId,
    ]);
    return result.insertId;
  }

  async updateNotification(id: number, data: UpdateNotificationData): Promise<void> {
    const fields: string[] = ['last_update = NOW()'];
    const values: any[] = [];

    if (data.nbIncrement) {
      fields.push('nb = nb + 1');
    }
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.url !== undefined) {
      fields.push('url = ?');
      values.push(data.url);
    }

    values.push(id);
    const sql = `UPDATE notif SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, values);
  }

  async deleteNotification(id: number, userId: number): Promise<boolean> {
    const sql = `DELETE FROM notif WHERE id = ? AND user_id = ?`;
    const result = await execute(sql, [id, userId]);
    return result.affectedRows > 0;
  }

  async deleteAllByUserId(userId: number): Promise<number> {
    const sql = `DELETE FROM notif WHERE user_id = ?`;
    const result = await execute(sql, [userId]);
    return result.affectedRows;
  }
}

export const notificationRepository: INotificationRepository = new MysqlNotificationRepository();
