import { query, queryOne, execute } from '../db/mysql.js';
import { Absence, CampaignPlayerAbsence, RawAbsenceRow } from '../types/index.js';

export interface IAbsenceRepository {
  findByUser(userId: number): Promise<Absence[]>;
  findById(id: number): Promise<Absence | null>;
  create(userId: number, beginDate: string, endDate: string, commentaire: string): Promise<Absence>;
  updateByIdAndUser(id: number, userId: number, beginDate: string, endDate: string, commentaire: string): Promise<boolean>;
  deleteByIdAndUser(id: number, userId: number): Promise<boolean>;
  findCurrentByCampaignId(campaignId: number, excludeUserId?: number): Promise<CampaignPlayerAbsence[]>;
  findCurrentByUser(userId: number): Promise<Absence[]>;
}

function formatDate(value: Date | string | null): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapRow(row: RawAbsenceRow): Absence {
  return {
    id: row.id,
    userId: row.user_id,
    beginDate: formatDate(row.begin_date),
    endDate: formatDate(row.end_date),
    commentaire: row.commentaire,
  };
}

export class MysqlAbsenceRepository implements IAbsenceRepository {
  async findByUser(userId: number): Promise<Absence[]> {
    const rows = await query<RawAbsenceRow>(
      `SELECT id, user_id, begin_date, end_date, commentaire
       FROM absences
       WHERE user_id = ?
       ORDER BY begin_date ASC, id ASC`,
      [userId]
    );

    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Absence | null> {
    const row = await queryOne<RawAbsenceRow>(
      `SELECT id, user_id, begin_date, end_date, commentaire
       FROM absences
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!row) {
      return null;
    }

    return mapRow(row);
  }

  async create(userId: number, beginDate: string, endDate: string, commentaire: string): Promise<Absence> {
    const result = await execute(
      `INSERT INTO absences (user_id, begin_date, end_date, commentaire)
       VALUES (?, ?, ?, ?)`,
      [userId, beginDate, endDate, commentaire]
    );

    return {
      id: result.insertId,
      userId,
      beginDate,
      endDate,
      commentaire,
    };
  }

  async updateByIdAndUser(id: number, userId: number, beginDate: string, endDate: string, commentaire: string): Promise<boolean> {
    const result = await execute(
      `UPDATE absences
       SET begin_date = ?, end_date = ?, commentaire = ?
       WHERE id = ? AND user_id = ?`,
      [beginDate, endDate, commentaire, id, userId]
    );

    return result.affectedRows > 0;
  }

  async deleteByIdAndUser(id: number, userId: number): Promise<boolean> {
    const result = await execute(
      `DELETE FROM absences
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    return result.affectedRows > 0;
  }

  async findCurrentByCampaignId(campaignId: number, excludeUserId?: number): Promise<CampaignPlayerAbsence[]> {
    const rows = await query<RawAbsenceRow & { username: string; is_mj: number }>(
      `SELECT a.id, a.user_id, a.begin_date, a.end_date, a.commentaire, u.username,
              (a.user_id = c.mj_id) AS is_mj
       FROM absences a
       INNER JOIN user u ON u.id = a.user_id
       INNER JOIN campagne c ON c.id = ?
       LEFT JOIN campagne_participant cp ON cp.user_id = a.user_id AND cp.campagne_id = c.id AND cp.statut = 1
       WHERE (cp.user_id IS NOT NULL OR a.user_id = c.mj_id)
         AND a.begin_date <= CURDATE()
         AND a.end_date >= CURDATE()
         AND a.user_id != ?
       ORDER BY a.begin_date ASC, u.username ASC`,
      [campaignId, excludeUserId ?? 0]
    );

    return rows.map((row) => ({
      ...mapRow(row),
      username: row.username,
      isMj: Boolean(row.is_mj),
    }));
  }

  async findCurrentByUser(userId: number): Promise<Absence[]> {
    const rows = await query<RawAbsenceRow>(
      `SELECT id, user_id, begin_date, end_date, commentaire
       FROM absences
       WHERE user_id = ?
         AND begin_date <= CURDATE()
         AND end_date >= CURDATE()
       ORDER BY begin_date ASC, id ASC`,
      [userId]
    );

    return rows.map(mapRow);
  }
}

export const absenceRepository = new MysqlAbsenceRepository();
