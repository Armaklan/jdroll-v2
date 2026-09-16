import { query, queryOne, execute } from '../db/mysql.js';

export interface DicerRoll {
  id: number;
  userId: number;
  campagneId: number;
  createDate: string;
  result: string;
  description: string;
}

export interface DicerRollWithUser extends DicerRoll {
  username: string;
  userAvatar: string | null;
  userProfil?: number;
}

export interface IDicerRepository {
  createRoll(data: {
    userId: number;
    campagneId: number;
    result: string;
    description: string;
  }): Promise<number>;
  getRollById(id: number): Promise<DicerRoll | null>;
  getRollWithUserById(id: number): Promise<DicerRollWithUser | null>;
  getRecentRollsByCampaign(campagneId: number, limit?: number, userId?: number): Promise<DicerRollWithUser[]>;
}

export class MysqlDicerRepository implements IDicerRepository {
  async createRoll(data: {
    userId: number;
    campagneId: number;
    result: string;
    description: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO dicer (user_id, campagne_id, create_date, result, description)
      VALUES (?, ?, NOW(), ?, ?)
    `;

    const res = await execute(sql, [
      data.userId,
      data.campagneId,
      data.result.slice(0, 500),
      data.description.slice(0, 900),
    ]);

    return res.insertId;
  }

  async getRollById(id: number): Promise<DicerRoll | null> {
    const sql = `
      SELECT 
        id,
        user_id AS userId,
        campagne_id AS campagneId,
        create_date AS createDate,
        result,
        description
      FROM dicer
      WHERE id = ?
    `;

    interface RawDicerRow {
      id: number;
      userId: number;
      campagneId: number;
      createDate: Date | string;
      result: string | null;
      description: string | null;
    }

    const row = await queryOne<RawDicerRow>(sql, [id]);
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      campagneId: row.campagneId,
      createDate:
        row.createDate instanceof Date
          ? row.createDate.toISOString()
          : String(row.createDate || ''),
      result: row.result || '',
      description: row.description || '',
    };
  }

  async getRollWithUserById(id: number): Promise<DicerRollWithUser | null> {
    const sql = `
      SELECT 
        d.id,
        d.user_id AS userId,
        d.campagne_id AS campagneId,
        d.create_date AS createDate,
        d.result,
        d.description,
        COALESCE(u.username, 'Inconnu') AS username,
        u.avatar AS userAvatar,
        u.profil AS userProfil
      FROM dicer d
      LEFT JOIN user u ON d.user_id = u.id
      WHERE d.id = ?
    `;

    interface RawDicerWithUserRow {
      id: number;
      userId: number;
      campagneId: number;
      createDate: Date | string;
      result: string | null;
      description: string | null;
      username: string;
      userAvatar: string | null;
      userProfil?: number | null;
    }

    const row = await queryOne<RawDicerWithUserRow>(sql, [id]);
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      campagneId: row.campagneId,
      createDate:
        row.createDate instanceof Date
          ? row.createDate.toISOString()
          : String(row.createDate || ''),
      result: row.result || '',
      description: row.description || '',
      username: row.username || 'Inconnu',
      userAvatar: row.userAvatar || null,
      userProfil: row.userProfil ?? 0,
    };
  }

  async getRecentRollsByCampaign(
    campagneId: number,
    limit: number = 20,
    userId?: number
  ): Promise<DicerRollWithUser[]> {
    const whereClauses = ['d.campagne_id = ?'];
    const params: any[] = [campagneId];

    if (userId !== undefined && userId !== null) {
      whereClauses.push('d.user_id = ?');
      params.push(userId);
    }

    params.push(Math.max(1, limit));

    const sql = `
      SELECT 
        d.id,
        d.user_id AS userId,
        d.campagne_id AS campagneId,
        d.create_date AS createDate,
        d.result,
        d.description,
        COALESCE(u.username, 'Inconnu') AS username,
        u.avatar AS userAvatar,
        u.profil AS userProfil
      FROM dicer d
      LEFT JOIN user u ON d.user_id = u.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY d.id DESC
      LIMIT ?
    `;

    interface RawDicerWithUserRow {
      id: number;
      userId: number;
      campagneId: number;
      createDate: Date | string;
      result: string | null;
      description: string | null;
      username: string;
      userAvatar: string | null;
      userProfil?: number | null;
    }

    const rows = await query<RawDicerWithUserRow>(sql, params);
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      campagneId: row.campagneId,
      createDate:
        row.createDate instanceof Date
          ? row.createDate.toISOString()
          : String(row.createDate || ''),
      result: row.result || '',
      description: row.description || '',
      username: row.username || 'Inconnu',
      userAvatar: row.userAvatar || null,
      userProfil: row.userProfil ?? 0,
    }));
  }
}

export const dicerRepository = new MysqlDicerRepository();
