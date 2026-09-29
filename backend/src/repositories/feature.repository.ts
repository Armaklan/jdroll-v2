import { query, queryOne, execute } from '../db/mysql.js';
import { FeatureFlip } from '../types/index.js';

export interface IFeatureRepository {
  findAll(): Promise<FeatureFlip[]>;
  findByName(name: string): Promise<FeatureFlip | null>;
  setEnabled(name: string, enabled: boolean): Promise<void>;
}

export class MysqlFeatureRepository implements IFeatureRepository {
  async findAll(): Promise<FeatureFlip[]> {
    return query<FeatureFlip>(
      `SELECT id, name, description, enabled
       FROM feature_flip
       ORDER BY name ASC`
    );
  }

  async findByName(name: string): Promise<FeatureFlip | null> {
    const feature = await queryOne<FeatureFlip>(
      `SELECT id, name, description, enabled
       FROM feature_flip
       WHERE name = ?
       LIMIT 1`,
      [name]
    );
    return feature || null;
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const result = await execute(
      `UPDATE feature_flip SET enabled = ? WHERE name = ?`,
      [enabled ? 1 : 0, name]
    );

    if (result.affectedRows === 0) {
      throw new Error(`Feature avec le nom ${name} introuvable`);
    }
  }
}

export const featureRepository = new MysqlFeatureRepository();
