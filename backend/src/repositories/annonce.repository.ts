import { query, queryOne, execute } from '../db/mysql.js';
import { Annonce, RawAnnonceRow } from '../types/index.js';

export interface IAnnonceRepository {
  findAll(): Promise<Annonce[]>;
  findVisible(now: Date): Promise<Annonce[]>;
  findById(id: number): Promise<Annonce | null>;
  create(title: string, content: string, endDate: string): Promise<Annonce>;
  update(id: number, title: string, content: string, endDate: string): Promise<boolean>;
}

function formatDate(value: Date | string): string {
  if (typeof value === 'string') {
    return value;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function mapRow(row: RawAnnonceRow): Annonce {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createDate: formatDate(row.create_date),
    endDate: formatDate(row.end_date),
  };
}

export class MysqlAnnonceRepository implements IAnnonceRepository {
  async findAll(): Promise<Annonce[]> {
    const rows = await query<RawAnnonceRow>(
      `SELECT id, title, content, create_date, end_date
       FROM annonce
       ORDER BY create_date DESC, id DESC`
    );
    return rows.map(mapRow);
  }

  async findVisible(now: Date): Promise<Annonce[]> {
    const rows = await query<RawAnnonceRow>(
      `SELECT id, title, content, create_date, end_date
       FROM annonce
       WHERE create_date <= ? AND end_date >= ?
       ORDER BY create_date DESC, id DESC`,
      [now, now]
    );
    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Annonce | null> {
    const row = await queryOne<RawAnnonceRow>(
      `SELECT id, title, content, create_date, end_date
       FROM annonce
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return row ? mapRow(row) : null;
  }

  async create(title: string, content: string, endDate: string): Promise<Annonce> {
    const result = await execute(
      `INSERT INTO annonce (title, content, end_date)
       VALUES (?, ?, ?)`,
      [title, content, endDate]
    );

    const created = await this.findById(result.insertId);
    if (!created) {
      throw new Error('Annonce créée introuvable');
    }
    return created;
  }

  async update(id: number, title: string, content: string, endDate: string): Promise<boolean> {
    const result = await execute(
      `UPDATE annonce SET title = ?, content = ?, end_date = ? WHERE id = ?`,
      [title, content, endDate, id]
    );
    return result.affectedRows > 0;
  }
}

export const annonceRepository = new MysqlAnnonceRepository();
