import { query, queryOne, execute } from '../db/mysql.js';
import { Note, RawNoteRow } from '../types/index.js';

export interface INoteRepository {
  findAllByUserAndCampaign(userId: number, campaignId: number): Promise<Note[]>;
  findById(id: number): Promise<Note | null>;
  createNote(campaignId: number, userId: number, content: string): Promise<Note>;
  updateNote(id: number, content: string): Promise<Note | null>;
  deleteNote(id: number): Promise<boolean>;
}

export class MysqlNoteRepository implements INoteRepository {
  async findAllByUserAndCampaign(userId: number, campaignId: number): Promise<Note[]> {
    const rows = await query<RawNoteRow>(
      `SELECT id, campagne_id, user_id, content, last_update
       FROM note
       WHERE campagne_id = ? AND user_id = ?
       ORDER BY id ASC`,
      [campaignId, userId]
    );

    return rows.map((row) => ({
      id: row.id,
      campaignId: row.campagne_id,
      userId: row.user_id,
      content: row.content,
      lastUpdate: row.last_update,
    }));
  }

  async findById(id: number): Promise<Note | null> {
    const row = await queryOne<RawNoteRow>(
      `SELECT id, campagne_id, user_id, content, last_update
       FROM note
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      campaignId: row.campagne_id,
      userId: row.user_id,
      content: row.content,
      lastUpdate: row.last_update,
    };
  }

  async createNote(campaignId: number, userId: number, content: string): Promise<Note> {
    const result = await execute(
      `INSERT INTO note (campagne_id, user_id, content, last_update)
       VALUES (?, ?, ?, NOW())`,
      [campaignId, userId, content]
    );

    return {
      id: result.insertId,
      campaignId,
      userId,
      content,
      lastUpdate: new Date().toISOString(),
    };
  }

  async updateNote(id: number, content: string): Promise<Note | null> {
    await execute(
      `UPDATE note
       SET content = ?, last_update = NOW()
       WHERE id = ?`,
      [content, id]
    );

    return this.findById(id);
  }

  async deleteNote(id: number): Promise<boolean> {
    const result = await execute(
      `DELETE FROM note WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export const noteRepository = new MysqlNoteRepository();
