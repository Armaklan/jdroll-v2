import mysql from 'mysql2/promise';
import {
  NewCampaignData,
  NewSectionData,
  NewTopicData,
  NewPnjData,
  NewPostData,
  NewDiceRollData,
  NewCampaignSheetData,
} from '../types.js';
import {
  targetQuery,
  targetQueryOne,
  withTargetTransaction,
} from '../db/mysql.js';

export interface IJdrollTarget {
  ensureMigrationTable(): Promise<void>;
  findUserIdByUsername(username: string): Promise<number | null>;
  addCampaignParticipant(campaignId: number, userId: number, statut: number): Promise<void>;
  setCampaignMj(campaignId: number, mjId: number): Promise<void>;
  attachPersoToUser(persoId: number, userId: number): Promise<void>;
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
  createPnjWithMapping(sourceKey: string, data: NewPnjData): Promise<number>;
  createPostsWithMapping(topicId: number, posts: NewPostData[]): Promise<void>;
  createDiceRollsWithMapping(rolls: NewDiceRollData[]): Promise<void>;
  /**
   * Applique une fiche codée à campagne_config d'une campagne migrée
   * (template_img, template_fields, text_color) et mémorise la correspondance
   * source `generateur_fiche` -> campagne (clé `fiche:<id>`).
   */
  applyCampaignSheet(
    sourceKey: string,
    campaignId: number,
    data: NewCampaignSheetData
  ): Promise<void>;
  deleteCampaignMigration(targetCampaignId: number, sourceKeys: string[]): Promise<void>;
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
const DICE_ROLL_BATCH_SIZE = 500;

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

  /**
   * Ajoute (ou met à jour) le statut d'un participant d'une campagne.
   * statut : 0 = en attente, 1 = joueur validé, 2 = joueur validé + MJ assistant.
   * Un statut existant supérieur n'est jamais rétrogradé.
   */
  async addCampaignParticipant(campaignId: number, userId: number, statut: number): Promise<void> {
    await withTargetTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO campagne_participant (campagne_id, user_id, statut)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE statut = GREATEST(statut, VALUES(statut))`,
        [campaignId, userId, statut]
      );
      await connection.query(
        `UPDATE campagne
          SET nb_joueurs_actuel = (
            SELECT COUNT(DISTINCT user_id) FROM campagne_participant
             WHERE campagne_id = ? AND statut >= 1
          )
          WHERE id = ?`,
        [campaignId, campaignId]
      );
    });
  }

  async setCampaignMj(campaignId: number, mjId: number): Promise<void> {
    await withTargetTransaction(async (connection) => {
      await connection.query('UPDATE campagne SET mj_id = ? WHERE id = ?', [mjId, campaignId]);
    });
  }

  async attachPersoToUser(persoId: number, userId: number): Promise<void> {
    await withTargetTransaction(async (connection) => {
      await connection.query('UPDATE personnages SET user_id = ? WHERE id = ?', [userId, persoId]);
    });
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

  async createPnjWithMapping(sourceKey: string, data: NewPnjData): Promise<number> {
    return withTargetTransaction(async (connection) => {
      const [result] = await connection.query(
        `INSERT INTO personnages (
           campagne_id, user_id, name, concept, avatar,
           publicDescription, privateDescription, technical, statut,
           cat_id, perso_fields, widgets
         ) VALUES (?, NULL, ?, '', ?, ?, ?, '', 0, NULL, NULL, '')`,
        [
          data.campagneId,
          data.name,
          data.avatar,
          data.publicDescription,
          data.privateDescription,
        ]
      );
      const persoId = (result as mysql.ResultSetHeader).insertId;
      await insertMapping(connection, 'intervenant', sourceKey, 'personnages', persoId);
      return persoId;
    });
  }

  async createPostsWithMapping(topicId: number, posts: NewPostData[]): Promise<void> {
    await withTargetTransaction(async (connection) => {
      let lastPostId: number | null = null;

      for (let offset = 0; offset < posts.length; offset += POST_BATCH_SIZE) {
        const batch = posts.slice(offset, offset + POST_BATCH_SIZE);
        const values = batch.map(() => '(?, ?, ?, ?, ?, 0)').join(', ');
        const params = batch.flatMap((post) => [
          topicId,
          post.userId,
          post.persoId,
          post.content,
          post.createDate,
        ]);
        const [result] = await connection.query(
          `INSERT INTO posts (topic_id, user_id, perso_id, content, create_date, editor)
           VALUES ${values}`,
          params
        );

        const mappingValues = batch.map(() => '(?, ?, ?, ?)').join(', ');
        // insertId est l'id de la première ligne du batch courant : l'offset
        // du découpage ne doit pas être ajouté (les ids du batch suivent
        // directement insertId).
        const mappingParams = batch.flatMap((post, index) => {
          const insertId = (result as mysql.ResultSetHeader).insertId + index;
          lastPostId = insertId;
          const isDicePost = post.mappingKey.startsWith('demande_jet_post:');
          return [
            isDicePost ? 'demande_jet' : 'post',
            post.mappingKey,
            'posts',
            insertId,
          ];
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

  /**
   * Insère des lignes dicer (jets de dés espritjdr) avec leur mapping
   * demande_jet:<id source>. Les dates de création absentes (jet sans post
   * lié) prennent l'heure de la migration.
   */
  async createDiceRollsWithMapping(rolls: NewDiceRollData[]): Promise<void> {
    if (rolls.length === 0) {
      return;
    }

    await withTargetTransaction(async (connection) => {
      for (let offset = 0; offset < rolls.length; offset += DICE_ROLL_BATCH_SIZE) {
        const batch = rolls.slice(offset, offset + DICE_ROLL_BATCH_SIZE);
        const values = batch.map(() => '(?, ?, COALESCE(?, NOW()), ?, ?)').join(', ');
        const params = batch.flatMap((roll) => [
          roll.userId,
          roll.campagneId,
          roll.createDate,
          roll.result.slice(0, 500),
          roll.description.slice(0, 900),
        ]);
        const [result] = await connection.query(
          `INSERT INTO dicer (user_id, campagne_id, create_date, result, description)
           VALUES ${values}`,
          params
        );

        const mappingValues = batch.map(() => '(?, ?, ?, ?)').join(', ');
        // insertId est l'id de la première ligne du batch courant (voir
        // createPostsWithMapping).
        const mappingParams = batch.flatMap((roll, index) => {
          const insertId = (result as mysql.ResultSetHeader).insertId + index;
          return ['demande_jet', `demande_jet:${roll.sourceId}`, 'dicer', insertId];
        });
        await connection.query(
          `INSERT INTO espritjdr_migration (source_table, source_key, target_table, target_id)
           VALUES ${mappingValues}`,
          mappingParams
        );
      }
    });
  }

  /**
   * Supprime intégralement une campagne jdroll issue de la migration :
   * mappings espritjdr_migration (identifiés par les clés sources), posts,
   * topics, sections, personnages, jets de dés (dicer), participants,
   * configuration et campagne.
   * Les clés étrangères sans cascade (topics.last_post_id, read_post.topic_id)
   * sont détachées/vidées avant la suppression.
   */
  /**
   * Applique une fiche codée à campagne_config (upsert : la ligne de config est
   * créée si absente) et mémorise la correspondance source -> campagne.
   */
  async applyCampaignSheet(
    sourceKey: string,
    campaignId: number,
    data: NewCampaignSheetData
  ): Promise<void> {
    await withTargetTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO campagne_config (
           campagne_id, template, sidebar_text, link_sidebar_color,
           widgets, template_img, template_fields, text_color
         ) VALUES (?, '', '', '', '', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           template_img = VALUES(template_img),
           template_fields = VALUES(template_fields),
           text_color = VALUES(text_color)`,
        [campaignId, data.templateImg, data.templateFields, data.textColor]
      );
      await insertMapping(connection, 'generateur_fiche', sourceKey, 'campagne', campaignId);
    });
  }

  async deleteCampaignMigration(targetCampaignId: number, sourceKeys: string[]): Promise<void> {
    await withTargetTransaction(async (connection) => {
      if (sourceKeys.length > 0) {
        await connection.query(
          `DELETE FROM espritjdr_migration
            WHERE source_key IN (${sourceKeys.map(() => '?').join(', ')})`,
          sourceKeys
        );
      }

      await connection.query(
        `DELETE rp FROM read_post rp
           JOIN topics t ON t.id = rp.topic_id
           JOIN sections s ON s.id = t.section_id
          WHERE s.campagne_id = ?`,
        [targetCampaignId]
      );
      await connection.query(
        `UPDATE topics t
           JOIN sections s ON s.id = t.section_id
            SET t.last_post_id = NULL
          WHERE s.campagne_id = ?`,
        [targetCampaignId]
      );
      await connection.query(
        `DELETE p FROM posts p
           JOIN topics t ON t.id = p.topic_id
           JOIN sections s ON s.id = t.section_id
          WHERE s.campagne_id = ?`,
        [targetCampaignId]
      );
      await connection.query(
        `DELETE t FROM topics t
           JOIN sections s ON s.id = t.section_id
          WHERE s.campagne_id = ?`,
        [targetCampaignId]
      );
      await connection.query('DELETE FROM personnages WHERE campagne_id = ?', [targetCampaignId]);
      await connection.query('DELETE FROM dicer WHERE campagne_id = ?', [targetCampaignId]);
      await connection.query('DELETE FROM campagne_participant WHERE campagne_id = ?', [targetCampaignId]);
      await connection.query('DELETE FROM sections WHERE campagne_id = ?', [targetCampaignId]);
      await connection.query('DELETE FROM campagne_config WHERE campagne_id = ?', [targetCampaignId]);
      await connection.query('DELETE FROM campagne WHERE id = ?', [targetCampaignId]);
    });
  }
}

export const jdrollTarget = new MysqlJdrollTarget();
