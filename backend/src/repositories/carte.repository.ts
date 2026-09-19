import { query, queryOne, execute } from '../db/mysql.js';
import { CarteSummary, RawCarteRow } from '../types/index.js';

export interface CreateCarteData {
  campagneId: number;
  name: string;
  description?: string;
  image: string;
  published?: boolean;
  config?: string;
}

export interface UpdateCarteData {
  name?: string;
  description?: string;
  image?: string;
  published?: boolean;
  config?: string;
}

export interface CarteRecord extends CarteSummary {
  config: string;
  mjId?: number;
}

export interface ICarteRepository {
  findByCampaignId(campaignId: number, withUnpublished?: boolean): Promise<CarteSummary[]>;
  searchCampaignCartes(campaignId: number, queryText: string, withUnpublished?: boolean): Promise<CarteSummary[]>;
  findById(id: number): Promise<CarteRecord | null>;
  createCarte(data: CreateCarteData): Promise<number>;
  updateCarte(id: number, data: UpdateCarteData): Promise<void>;
  deleteCarte(id: number): Promise<void>;
}

export class MysqlCarteRepository implements ICarteRepository {
  async findByCampaignId(campaignId: number, withUnpublished: boolean = false): Promise<CarteSummary[]> {
    let sql = `
      SELECT id, campagne_id, name, description, image, published
      FROM carte
      WHERE campagne_id = ?
    `;
    const params: any[] = [campaignId];

    if (!withUnpublished) {
      sql += ` AND published = 1`;
    }

    sql += ` ORDER BY name ASC`;

    const rows = await query<RawCarteRow>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      campagneId: row.campagne_id,
      name: row.name || '',
      description: row.description || '',
      image: row.image || '',
      published: Boolean(row.published),
    }));
  }

  async searchCampaignCartes(
    campaignId: number,
    queryText: string,
    withUnpublished: boolean = false
  ): Promise<CarteSummary[]> {
    const trimmed = queryText.trim();
    let sql = `
      SELECT id, campagne_id, name, description, image, published
      FROM carte
      WHERE campagne_id = ?
    `;
    const params: any[] = [campaignId];

    if (!withUnpublished) {
      sql += ` AND published = 1`;
    }

    if (trimmed) {
      sql += ` AND LOWER(name) LIKE LOWER(?)`;
      params.push(`%${trimmed}%`);
    }

    sql += ` ORDER BY name ASC LIMIT 20`;

    const rows = await query<RawCarteRow>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      campagneId: row.campagne_id,
      name: row.name || '',
      description: row.description || '',
      image: row.image || '',
      published: Boolean(row.published),
    }));
  }

  async findById(id: number): Promise<CarteRecord | null> {
    const sql = `
      SELECT c.id, c.campagne_id, c.name, c.description, c.image, c.published, c.config, cmp.mj_id
      FROM carte c
      LEFT JOIN campagne cmp ON c.campagne_id = cmp.id
      WHERE c.id = ?
      LIMIT 1
    `;

    const row = await queryOne<RawCarteRow>(sql, [id]);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      campagneId: row.campagne_id,
      name: row.name || '',
      description: row.description || '',
      image: row.image || '',
      published: Boolean(row.published),
      config: row.config || '{"markers":[],"tabReduce":false}',
      mjId: row.mj_id !== null && row.mj_id !== undefined ? Number(row.mj_id) : undefined,
    };
  }

  async createCarte(data: CreateCarteData): Promise<number> {
    const sql = `
      INSERT INTO carte (campagne_id, name, description, image, published, config)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await execute(sql, [
      data.campagneId,
      data.name,
      data.description || '',
      data.image,
      data.published !== false ? 1 : 0,
      data.config || '{"markers":[],"tabReduce":false}',
    ]);

    return result.insertId;
  }

  async updateCarte(id: number, data: UpdateCarteData): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.image !== undefined) {
      fields.push('image = ?');
      values.push(data.image);
    }
    if (data.published !== undefined) {
      fields.push('published = ?');
      values.push(data.published ? 1 : 0);
    }
    if (data.config !== undefined) {
      fields.push('config = ?');
      values.push(data.config);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE carte SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, values);
  }

  async deleteCarte(id: number): Promise<void> {
    const sql = `DELETE FROM carte WHERE id = ?`;
    await execute(sql, [id]);
  }
}

export const carteRepository: ICarteRepository = new MysqlCarteRepository();
