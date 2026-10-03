import mysql from 'mysql2/promise';
import {
  NewCampaignData,
  NewSectionData,
  NewTopicData,
  NewPostData,
} from '../types.js';
import {
  targetQuery,
  targetQueryOne,
  withTargetTransaction,
} from '../db/mysql.js';

export interface IJdrollTarget {
  ensureMigrationTable(): Promise<void>;
  findUserIdByUsername(username: string): Promise<number | null>;
  createUser(data: {
    username: string;
    mail: string;
    passwordHash: string;
    description: string;
  }): Promise<number>;
  getMigrationTargetId(sourceTable: string, sourceKey: string): Promise<number | null>;
  getMigrationTargetIds(sourceTable: string, sourceKeys: string[]): Promise<Map<string, number>>;
  createCampaignWithMapping(sourceKey: string, data: NewCampaignData): Promise<number>;
  createSectionWithMapping(sourceKey: string, data: NewSectionData): Promise<number>;
  createTopicWithMapping(sourceKey: string, data: NewTopicData): Promise<number>;
  createPostsWithMapping(topicKey: string, topicId: number, posts: NewPostData[]): Promise<void>;
}

const MAPPING_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS espritjdr_migration (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_table VARCHAR(50) NOT NULL,
    source_key VARCHAR(100) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT UNSIGNED NOT NULL,
    migrated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_source (source_table, source_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

const POST_BATCH_SIZE = 500;

function placeholders(count: number): string {
  return `(${', ?'.repeat(count).slice(2)})`;
}

async function insertMapping(
  connection: mysql.PoolConnection,
  sourceTable: string,
  sourceKey: string,
  targetTable: string,
  targetId: number
): Promise<void> {
  await connection.query(
    `INSERT INTO espritjdr_migration (source_table, source_key, target_table, target_id)
     VALUES (?, ?, ?, ?)`,
    [sourceTable, sourceKey, targetTable, targetId]
  );
}

export class MysqlJdrollTarget implements IJdrollTarget {
  async ensureMigrationTable(): Promise<void> {
    await targetQuery(MAPPING_TABLE_DDL);
  }

  async findUserIdByUsername(username: string): Promise<number | null> {
    const row = await targetQueryOne<{ id: number }>(
      'SELECT id FROM user WHERE username = ? LIMIT 1',
      [username]
    );
    return row?.id ?? null;
  }

  async createUser(data: {
    username: string;
    mail: string;
    passwordHash: string;
    description: string;
  }): Promise<number> {
    return withTargetTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO user (username, mail, password, avatar, description, profil, titre, subscribe_date)
         VALUES (?, ?, ?, '', ?, 0, '', NOW())`,
        [data.username, data.mail, data.passwordHash, data.description]
      );
      return (result as mysql.ResultSetHeader).insertId;
    });
  }

  async getMigrationTargetId(sourceTable: string, sourceKey: string): Promise<number | null> {
    const row = await targetQueryOne<{ target_id: number }>(
      'SELECT target_id FROM espritjdr_migration WHERE source_table = ? AND source_key = ? LIMIT 1',
      [sourceTable, sourceKey]
    );
    return row?.target_id ?? null;
  }

  async getMigrationTargetIds(
    sourceTable: string,
    sourceKeys: string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (sourceKeys.length === 0) {
      return result;
    }
    const rows = await targetQuery<{ source_key: string; target_id: number }>(
      `SELECT source_key, target_id FROM espritjdr_migration
        WHERE source_table = ? AND source_key IN (${sourceKeys.map(() => '?').join(', ')})`,
      [sourceTable, ...sourceKeys]
    );
    for (const row of rows) {
      result.set(row.source_key, row.target_id);
    }
    return result;
  }

  async createCampaignWithMapping(sourceKey: string, data: NewCampaignData): Promise<number> {
    return withTargetTransaction(async (connection) => {
      const [campaignResult] = await connection.query(
        `INSERT INTO campagne (
           mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere,
           systeme, univers, description, statut, is_recrutement_open,
           rythme, rp, is_admin_open, is_multi_character
         ) VALUES (?, ?, 0, ?, '', ?, ?, ?, ?, ?, 2, 1, 1, 0)`,
        [
          data.mjId,
          data.nbJoueurs,
          data.name,
          data.systeme,
          data.univers,
          data.description,
          data.statut,
          data.isRecrutementOpen ? 1 : 0,
        ]
      );
      const campaignId = (campaignResult as mysql.ResultSetHeader).insertId;

      await connection.query(
        `INSERT INTO campagne_config (
           campagne_id, banniere, hr, odd_line_color, even_line_color,
           sidebar_color, link_color, template, sidebar_text, link_sidebar_color,
           text_color, dialogue_color, pensee_color, rp1_color, rp2_color,
           quote_color, width, widgets, default_dice, default_perso_id,
           template_html, template_img, template_fields, sheet_mode, sheet_definition
         ) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, '', '', '', NULL,
                   '#4488cc', '#8844cc', '#ff6600', '#5eff6c', NULL,
                   '800px', '', '1d20', NULL, NULL, NULL, NULL, NULL, NULL)`,
        [campaignId]
      );

      await insertMapping(connection, 'campagne', sourceKey, 'campagne', campaignId);
      return campaignId;
    });
  }

  async createSectionWithMapping(sourceKey: string, data: NewSectionData): Promise<number> {
    return withTargetTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO sections (campagne_id, title, ordre, default_collapse, banniere)
         VALUES (?, ?, ?, 0, '')`,
        [data.campagneId, data.title, data.ordre]
      );
      const sectionId = (result as mysql.ResultSetHeader).insertId;
      await insertMapping(connection, 'section', sourceKey, 'sections', sectionId);
      return sectionId;
    });
  }

  async createTopicWithMapping(sourceKey: string, data: NewTopicData): Promise<number> {
    return withTargetTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO topics (section_id, title, stickable, is_private, is_closed, ordre)
         VALUES (?, ?, 0, 0, ?, ?)`,
        [data.sectionId, data.title, data.isClosed ? 1 : 0, data.ordre]
      );
      const topicId = (result as mysql.ResultSetHeader).insertId;
      await insertMapping(connection, 'topic', sourceKey, 'topics', topicId);
      return topicId;
    });
  }

  async createPostsWithMapping(topicKey: string, topicId: number, posts: NewPostData[]): Promise<void> {
    await withTargetTransaction(async (connection) => {
      let lastPostId: number | null = null;

      for (let offset = 0; offset < posts.length; offset += POST_BATCH_SIZE) {
        const batch = posts.slice(offset, offset + POST_BATCH_SIZE);
        const values = batch.map(() => '(?, ?, NULL, ?, ?, 0)').join(', ');
        const params = batch.flatMap((post) => [
          topicId,
          post.userId,
          post.content,
          post.createDate,
        ]);
        const [result] = await connection.query(
          `INSERT INTO posts (topic_id, user_id, perso_id, content, create_date, editor)
           VALUES ${values}`,
          params
        );

        const mappingValues = batch.map(() => '(?, ?, ?, ?)').join(', ');
        const mappingParams = batch.flatMap((post, index) => {
          const insertId = (result as mysql.ResultSetHeader).insertId + offset + index;
          lastPostId = insertId;
          return ['post', `post:${post.sourceId}`, 'posts', insertId];
        });
        await connection.query(
          `INSERT INTO espritjdr_migration (source_table, source_key, target_table, target_id)
           VALUES ${mappingValues}`,
          mappingParams
        );
      }

      if (lastPostId !== null) {
        await connection.query('UPDATE topics SET last_post_id = ? WHERE id = ?', [
          lastPostId,
          topicId,
        ]);
      }
    });
  }
}

export const jdrollTarget = new MysqlJdrollTarget();
