import { query, queryOne, execute } from '../db/mysql.js';
import {
  ForumSectionSummary,
  ForumTopicSummary,
  ForumLastPost,
  ForumPost,
  RawTopicDetail,
  CharacterSummary,
  TopicUserSummary,
} from '../types/index.js';

export interface IForumRepository {
  findSectionsByCampaignId(campaignId: number | null, userId?: number): Promise<ForumSectionSummary[]>;
  findSectionById(sectionId: number): Promise<{ id: number; campagneId: number | null; title: string; ordre: number; defaultCollapse: boolean; banniere: string } | null>;
  createSection(data: { campagneId: number | null; title: string; ordre?: number; defaultCollapse?: boolean; banniere?: string }): Promise<number>;
  updateSection(sectionId: number, data: { title?: string; defaultCollapse?: boolean; banniere?: string }): Promise<void>;
  deleteSection(sectionId: number): Promise<void>;
  getMaxSectionOrdre(campagneId: number | null): Promise<number>;
  reorderSections(campaignId: number, sectionIds: number[]): Promise<void>;
  createTopic(data: { sectionId: number; title: string; stickable?: boolean; isPrivate?: number | boolean; isClosed?: boolean; ordre?: number; canReadUserIds?: number[] }): Promise<number>;
  updateTopic(topicId: number, data: { title?: string; stickable?: boolean; isPrivate?: number | boolean; isClosed?: boolean; canReadUserIds?: number[] }): Promise<void>;
  deleteTopic(topicId: number): Promise<void>;
  getMaxTopicOrdre(sectionId: number): Promise<number>;
  reorderTopics(campaignId: number, sections: Array<{ sectionId: number; topicIds: number[] }>): Promise<void>;
  findTopicById(topicId: number): Promise<RawTopicDetail | null>;
  countPostsByTopicId(topicId: number): Promise<number>;
  findPostsByTopicId(topicId: number, offset: number, limit: number, userId?: number): Promise<ForumPost[]>;
  getUserLastReadPostId(topicId: number, userId: number): Promise<number | null>;
  findFirstUnreadPost(topicId: number, lastReadPostId: number): Promise<{ id: number } | null>;
  findFirstPost(topicId: number): Promise<{ id: number } | null>;
  countPostsAfterPostId(topicId: number, postId: number): Promise<number>;
  getPostById(postId: number, userId?: number): Promise<ForumPost | null>;
  createPost(data: { topicId: number; userId: number | null; persoId: number | null; content: string; editor?: number }): Promise<number>;
  updatePost(postId: number, data: { content?: string; persoId?: number | null; editor?: number }): Promise<void>;
  deletePost(postId: number): Promise<void>;
  findLastPost(topicId: number, excludePostId?: number): Promise<{ id: number } | null>;
  updateTopicLastPost(topicId: number, postId: number | null): Promise<void>;
  markTopicAsRead(topicId: number, userId: number, postId: number): Promise<void>;
  findCampaignPersos(campagneId: number): Promise<CharacterSummary[]>;
  findUserCampaignPersos(campagneId: number, userId: number): Promise<CharacterSummary[]>;
  isUserCampaignMj(campagneId: number, userId: number): Promise<boolean>;
  isUserCampaignParticipant(campagneId: number, userId: number): Promise<boolean>;
  findPersoById(persoId: number): Promise<CharacterSummary | null>;
  getTopicCanReadUsers(topicId: number): Promise<TopicUserSummary[]>;
  getCanReadUsersByTopicIds(topicIds: number[]): Promise<Map<number, TopicUserSummary[]>>;
  setTopicCanReadUsers(topicId: number, userIds: number[]): Promise<void>;
  isUserTopicCanRead(topicId: number, userId: number): Promise<boolean>;
}

export class MysqlForumRepository implements IForumRepository {
  async findSectionsByCampaignId(campaignId: number | null, userId?: number): Promise<ForumSectionSummary[]> {
    const isGeneral = campaignId === null || campaignId === undefined;
    const sectionsSql = `
      SELECT 
        id,
        campagne_id AS campagneId,
        title,
        ordre,
        default_collapse AS defaultCollapse,
        banniere
      FROM sections
      WHERE ${isGeneral ? 'campagne_id IS NULL' : 'campagne_id = ?'}
      ORDER BY ordre ASC, id ASC
    `;

    interface RawSectionRow {
      id: number;
      campagneId: number | null;
      title: string;
      ordre: number;
      defaultCollapse: number;
      banniere: string | null;
    }

    const sectionRows = await query<RawSectionRow>(
      sectionsSql,
      isGeneral ? [] : [campaignId]
    );

    if (sectionRows.length === 0) {
      return [];
    }

    const currentUserId = userId ?? 0;
    const topicsSql = `
      SELECT 
        t.id,
        t.section_id AS sectionId,
        t.title,
        t.stickable,
        t.is_private AS isPrivate,
        t.ordre,
        t.is_closed AS isClosed,
        t.last_post_id AS lastPostId,
        p.create_date AS lastPostDate,
        p.user_id AS lastPostUserId,
        u.username AS lastPostUsername,
        u.avatar AS lastPostUserAvatar,
        u.profil AS lastPostUserProfil,
        p.perso_id AS lastPostPersoId,
        rp.post_id AS userLastReadPostId,
        (SELECT COUNT(*) FROM posts count_p WHERE count_p.topic_id = t.id) AS postsCount
      FROM topics t
      JOIN sections s ON t.section_id = s.id
      LEFT JOIN posts p ON t.last_post_id = p.id
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN (
        SELECT topic_id, MAX(post_id) AS post_id
        FROM read_post
        WHERE user_id = ?
        GROUP BY topic_id
      ) rp ON rp.topic_id = t.id
      WHERE ${isGeneral ? 's.campagne_id IS NULL' : 's.campagne_id = ?'}
        AND (
          t.is_private != 1
          OR (? > 0 AND EXISTS (SELECT 1 FROM can_read cr WHERE cr.topic_id = t.id AND cr.user_id = ?))
          OR (? > 0 AND s.campagne_id IS NOT NULL AND EXISTS (SELECT 1 FROM campagne c WHERE c.id = s.campagne_id AND c.mj_id = ?))
        )
      ORDER BY t.stickable DESC, t.ordre ASC, t.id DESC
    `;

    interface RawTopicRow {
      id: number;
      sectionId: number;
      title: string;
      stickable: number;
      isPrivate: number;
      ordre: number;
      isClosed: number;
      lastPostId: number | null;
      lastPostDate: Date | string | null;
      lastPostUserId: number | null;
      lastPostUsername: string | null;
      lastPostUserAvatar: string | null;
      lastPostUserProfil?: number | null;
      lastPostPersoId: number | null;
      userLastReadPostId: number | null;
      postsCount: number;
    }

    const queryParams = isGeneral
      ? [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId]
      : [currentUserId, campaignId, currentUserId, currentUserId, currentUserId, currentUserId];

    const topicRows = await query<RawTopicRow>(topicsSql, queryParams);

    const privateTopicIds = topicRows.filter((r) => r.isPrivate === 1).map((r) => r.id);
    const canReadUsersMap = privateTopicIds.length > 0
      ? await this.getCanReadUsersByTopicIds(privateTopicIds)
      : new Map<number, TopicUserSummary[]>();

    const topicsBySection = new Map<number, ForumTopicSummary[]>();

    for (const row of topicRows) {
      const isRead = userId
        ? row.lastPostId === null ||
          (row.userLastReadPostId !== null &&
            row.userLastReadPostId !== undefined &&
            row.userLastReadPostId >= row.lastPostId)
        : true;

      let lastPost: ForumLastPost | null = null;
      if (row.lastPostId && row.lastPostUserId && row.lastPostUsername) {
        lastPost = {
          id: row.lastPostId,
          createDate:
            row.lastPostDate instanceof Date
              ? row.lastPostDate.toISOString()
              : String(row.lastPostDate || ''),
          userId: row.lastPostUserId,
          username: row.lastPostUsername,
          userAvatar: row.lastPostUserAvatar || '',
          userProfil: row.lastPostUserProfil ?? 0,
          persoId: row.lastPostPersoId ?? null,
        };
      }

      const topic: ForumTopicSummary = {
        id: row.id,
        sectionId: row.sectionId,
        title: row.title,
        stickable: Boolean(row.stickable),
        isPrivate: Number(row.isPrivate || 0),
        isClosed: Boolean(row.isClosed),
        ordre: row.ordre,
        postsCount: Number(row.postsCount || 0),
        lastPost,
        isRead,
        canReadUsers: row.isPrivate === 1 ? canReadUsersMap.get(row.id) || [] : undefined,
      };

      if (!topicsBySection.has(row.sectionId)) {
        topicsBySection.set(row.sectionId, []);
      }
      topicsBySection.get(row.sectionId)!.push(topic);
    }

    return sectionRows.map((section) => ({
      id: section.id,
      campagneId: section.campagneId,
      title: section.title,
      ordre: section.ordre,
      defaultCollapse: Boolean(section.defaultCollapse),
      banniere: section.banniere || '',
      topics: topicsBySection.get(section.id) || [],
    }));
  }

  async findTopicById(topicId: number): Promise<RawTopicDetail | null> {
    const sql = `
      SELECT 
        t.id,
        t.section_id AS sectionId,
        s.title AS sectionTitle,
        s.campagne_id AS campagneId,
        COALESCE(c.name, 'Forum Général') AS campaignTitle,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        t.title,
        t.stickable,
        t.is_private AS isPrivate,
        t.is_closed AS isClosed,
        t.ordre,
        t.last_post_id AS lastPostId
      FROM topics t
      JOIN sections s ON t.section_id = s.id
      LEFT JOIN campagne c ON s.campagne_id = c.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      WHERE t.id = ?
    `;

    return queryOne<RawTopicDetail>(sql, [topicId]);
  }

  async countPostsByTopicId(topicId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM posts
      WHERE topic_id = ?
    `;

    interface CountRow {
      total: number;
    }

    const res = await queryOne<CountRow>(sql, [topicId]);
    return Number(res?.total || 0);
  }

  async findPostsByTopicId(
    topicId: number,
    offset: number,
    limit: number,
    userId?: number
  ): Promise<ForumPost[]> {
    if (limit <= 0) {
      return [];
    }

    const sql = `
      SELECT 
        p.id,
        p.topic_id AS topicId,
        p.content,
        p.create_date AS createDate,
        p.editor,
        u.id AS userId,
        u.username,
        u.avatar AS userAvatar,
        u.profil AS userProfil,
        u.titre AS userTitre,
        perso.id AS persoId,
        perso.user_id AS persoUserId,
        perso.name AS persoName,
        perso.concept AS persoConcept,
        perso.avatar AS persoAvatar,
        perso.publicDescription AS persoPublicDescription,
        perso.widgets AS persoWidgets,
        rp.post_id AS userLastReadPostId
      FROM posts p
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN personnages perso ON p.perso_id = perso.id
      LEFT JOIN (
        SELECT topic_id, MAX(post_id) AS post_id
        FROM read_post
        WHERE topic_id = ? AND user_id = ?
        GROUP BY topic_id
      ) rp ON rp.topic_id = p.topic_id
      WHERE p.topic_id = ?
      ORDER BY p.id ASC
      LIMIT ? OFFSET ?
    `;

    interface RawPostRow {
      id: number;
      topicId: number;
      content: string;
      createDate: Date | string;
      editor: number;
      userId: number | null;
      username: string | null;
      userAvatar: string | null;
      userProfil: number | null;
      userTitre: string | null;
      persoId: number | null;
      persoUserId: number | null;
      persoName: string | null;
      persoConcept: string | null;
      persoAvatar: string | null;
      persoPublicDescription: string | null;
      persoWidgets: string | null;
      userLastReadPostId: number | null;
    }

    const rows = await query<RawPostRow>(sql, [topicId, userId ?? 0, topicId, limit, offset]);

    return rows.map((row) => {
      const isRead = userId
        ? row.userLastReadPostId !== null &&
          row.userLastReadPostId !== undefined &&
          row.userLastReadPostId >= row.id
        : true;

      return {
        id: row.id,
        topicId: row.topicId,
        content: row.content,
        createDate:
          row.createDate instanceof Date
            ? row.createDate.toISOString()
            : String(row.createDate || ''),
        editor: row.editor,
        user: {
          id: row.userId ?? 0,
          username: row.username ?? 'Anonyme',
          avatar: row.userAvatar ?? '',
          profil: row.userProfil ?? 0,
          titre: row.userTitre ?? '',
        },
        perso: row.persoId
          ? {
              id: row.persoId,
              userId: row.persoUserId ?? null,
              name: row.persoName ?? '',
              concept: row.persoConcept ?? '',
              avatar: row.persoAvatar ?? '',
              publicDescription: row.persoPublicDescription ?? '',
              widgets: row.persoWidgets ?? null,
            }
          : null,
        isRead,
      };
    });
  }

  async getUserLastReadPostId(topicId: number, userId: number): Promise<number | null> {
    const sql = `
      SELECT MAX(post_id) AS postId
      FROM read_post
      WHERE topic_id = ? AND user_id = ?
    `;

    interface ReadPostRow {
      postId: number | null;
    }

    const row = await queryOne<ReadPostRow>(sql, [topicId, userId]);
    return row && row.postId !== null ? Number(row.postId) : null;
  }

  async findFirstUnreadPost(topicId: number, lastReadPostId: number): Promise<{ id: number } | null> {
    const sql = `
      SELECT id
      FROM posts
      WHERE topic_id = ? AND id > ?
      ORDER BY id ASC
      LIMIT 1
    `;

    interface FirstUnreadRow {
      id: number;
    }

    return queryOne<FirstUnreadRow>(sql, [topicId, lastReadPostId]);
  }

  async findFirstPost(topicId: number): Promise<{ id: number } | null> {
    const sql = `
      SELECT id
      FROM posts
      WHERE topic_id = ?
      ORDER BY id ASC
      LIMIT 1
    `;

    interface FirstPostRow {
      id: number;
    }

    return queryOne<FirstPostRow>(sql, [topicId]);
  }

  async countPostsAfterPostId(topicId: number, postId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS total
      FROM posts
      WHERE topic_id = ? AND id > ?
    `;

    interface CountRow {
      total: number;
    }

    const row = await queryOne<CountRow>(sql, [topicId, postId]);
    return Number(row?.total || 0);
  }

  async getPostById(postId: number, userId?: number): Promise<ForumPost | null> {
    const sql = `
      SELECT 
        p.id,
        p.topic_id AS topicId,
        p.content,
        p.create_date AS createDate,
        p.editor,
        u.id AS userId,
        u.username,
        u.avatar AS userAvatar,
        u.profil AS userProfil,
        u.titre AS userTitre,
        perso.id AS persoId,
        perso.user_id AS persoUserId,
        perso.name AS persoName,
        perso.concept AS persoConcept,
        perso.avatar AS persoAvatar,
        perso.publicDescription AS persoPublicDescription,
        perso.widgets AS persoWidgets,
        rp.post_id AS userLastReadPostId
      FROM posts p
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN personnages perso ON p.perso_id = perso.id
      LEFT JOIN (
        SELECT topic_id, MAX(post_id) AS post_id
        FROM read_post
        WHERE user_id = ?
        GROUP BY topic_id
      ) rp ON rp.topic_id = p.topic_id
      WHERE p.id = ?
    `;

    interface RawPostRow {
      id: number;
      topicId: number;
      content: string;
      createDate: Date | string;
      editor: number;
      userId: number | null;
      username: string | null;
      userAvatar: string | null;
      userProfil: number | null;
      userTitre: string | null;
      persoId: number | null;
      persoUserId: number | null;
      persoName: string | null;
      persoConcept: string | null;
      persoAvatar: string | null;
      persoPublicDescription: string | null;
      persoWidgets: string | null;
      userLastReadPostId: number | null;
    }

    const row = await queryOne<RawPostRow>(sql, [userId ?? 0, postId]);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      topicId: row.topicId,
      content: row.content,
      createDate:
        row.createDate instanceof Date
          ? row.createDate.toISOString()
          : String(row.createDate || ''),
      editor: row.editor,
      user: {
        id: row.userId ?? 0,
        username: row.username ?? 'Anonyme',
        avatar: row.userAvatar ?? '',
        profil: row.userProfil ?? 0,
        titre: row.userTitre ?? '',
      },
      perso: row.persoId
        ? {
            id: row.persoId,
            userId: row.persoUserId ?? null,
            name: row.persoName ?? '',
            concept: row.persoConcept ?? '',
            avatar: row.persoAvatar ?? '',
            publicDescription: row.persoPublicDescription ?? '',
            widgets: row.persoWidgets ?? null,
          }
        : null,
      isRead: true,
    };
  }

  async createPost(data: {
    topicId: number;
    userId: number | null;
    persoId: number | null;
    content: string;
    editor?: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO posts (topic_id, user_id, perso_id, content, create_date, editor)
      VALUES (?, ?, ?, ?, NOW(), ?)
    `;

    const result = await execute(sql, [
      data.topicId,
      data.userId ?? null,
      data.persoId ?? null,
      data.content,
      data.editor ?? 0,
    ]);

    return result.insertId;
  }

  async updatePost(
    postId: number,
    data: { content?: string; persoId?: number | null; editor?: number }
  ): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }

    if (data.persoId !== undefined) {
      updates.push('perso_id = ?');
      values.push(data.persoId);
    }

    if (data.editor !== undefined) {
      updates.push('editor = ?');
      values.push(data.editor);
    }

    if (updates.length === 0) return;

    values.push(postId);
    const sql = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
    await execute(sql, values);
  }

  async deletePost(postId: number): Promise<void> {
    const sql = `DELETE FROM posts WHERE id = ?`;
    await execute(sql, [postId]);
  }

  async findLastPost(topicId: number, excludePostId?: number): Promise<{ id: number } | null> {
    const sql = excludePostId
      ? `SELECT id FROM posts WHERE topic_id = ? AND id != ? ORDER BY id DESC LIMIT 1`
      : `SELECT id FROM posts WHERE topic_id = ? ORDER BY id DESC LIMIT 1`;

    interface LastPostRow {
      id: number;
    }

    return queryOne<LastPostRow>(sql, excludePostId ? [topicId, excludePostId] : [topicId]);
  }

  async updateTopicLastPost(topicId: number, postId: number | null): Promise<void> {
    const sql = `
      UPDATE topics
      SET last_post_id = ?
      WHERE id = ?
    `;

    await execute(sql, [postId ?? null, topicId]);
  }

  async markTopicAsRead(topicId: number, userId: number, postId: number): Promise<void> {
    const checkSql = `
      SELECT post_id AS postId
      FROM read_post
      WHERE topic_id = ? AND user_id = ?
    `;

    interface ReadPostCheckRow {
      postId: number;
    }

    const existingRows = await query<ReadPostCheckRow>(checkSql, [topicId, userId]);

    if (existingRows.length > 0) {
      const maxExisting = Math.max(...existingRows.map((r) => r.postId));
      const targetPostId = Math.max(maxExisting, postId);

      if (existingRows.length > 1) {
        // Nettoyer les doublons résiduels s'il y en avait
        await execute(
          `DELETE FROM read_post WHERE topic_id = ? AND user_id = ?`,
          [topicId, userId]
        );
        await execute(
          `INSERT INTO read_post (topic_id, user_id, post_id) VALUES (?, ?, ?)`,
          [topicId, userId, targetPostId]
        );
      } else if (targetPostId > existingRows[0].postId) {
        await execute(
          `UPDATE read_post SET post_id = ? WHERE topic_id = ? AND user_id = ?`,
          [targetPostId, topicId, userId]
        );
      }
    } else {
      const insertSql = `
        INSERT INTO read_post (topic_id, user_id, post_id)
        VALUES (?, ?, ?)
      `;
      await execute(insertSql, [topicId, userId, postId]);
    }
  }

  async findCampaignPersos(campagneId: number): Promise<CharacterSummary[]> {
    const sql = `
      SELECT 
        id,
        user_id AS userId,
        campagne_id AS campagneId,
        name,
        concept,
        avatar
      FROM personnages
      WHERE campagne_id = ?
      ORDER BY name ASC
    `;

    interface RawPersoRow {
      id: number;
      userId: number | null;
      campagneId: number;
      name: string;
      concept: string | null;
      avatar: string | null;
    }

    const rows = await query<RawPersoRow>(sql, [campagneId]);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      campagneId: r.campagneId,
      name: r.name,
      concept: r.concept || '',
      avatar: r.avatar || '',
    }));
  }

  async findUserCampaignPersos(campagneId: number, userId: number): Promise<CharacterSummary[]> {
    const sql = `
      SELECT 
        id,
        user_id AS userId,
        campagne_id AS campagneId,
        name,
        concept,
        avatar
      FROM personnages
      WHERE campagne_id = ? AND user_id = ?
      ORDER BY name ASC
    `;

    interface RawPersoRow {
      id: number;
      userId: number | null;
      campagneId: number;
      name: string;
      concept: string | null;
      avatar: string | null;
    }

    const rows = await query<RawPersoRow>(sql, [campagneId, userId]);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      campagneId: r.campagneId,
      name: r.name,
      concept: r.concept || '',
      avatar: r.avatar || '',
    }));
  }

  async isUserCampaignMj(campagneId: number, userId: number): Promise<boolean> {
    const sql = `SELECT mj_id AS mjId FROM campagne WHERE id = ?`;
    const row = await queryOne<{ mjId: number }>(sql, [campagneId]);
    return row ? row.mjId === userId : false;
  }

  async isUserCampaignParticipant(campagneId: number, userId: number): Promise<boolean> {
    const sql = `SELECT user_id AS userId FROM campagne_participant WHERE campagne_id = ? AND user_id = ? AND statut = 1`;
    const row = await queryOne<{ userId: number }>(sql, [campagneId, userId]);
    return Boolean(row);
  }

  async findPersoById(persoId: number): Promise<CharacterSummary | null> {
    const sql = `
      SELECT 
        id,
        user_id AS userId,
        campagne_id AS campagneId,
        name,
        concept,
        avatar
      FROM personnages
      WHERE id = ?
    `;

    interface RawPersoRow {
      id: number;
      userId: number | null;
      campagneId: number;
      name: string;
      concept: string | null;
      avatar: string | null;
    }

    const row = await queryOne<RawPersoRow>(sql, [persoId]);
    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      campagneId: row.campagneId,
      name: row.name,
      concept: row.concept || '',
      avatar: row.avatar || '',
    };
  }

  async findSectionById(sectionId: number): Promise<{
    id: number;
    campagneId: number | null;
    title: string;
    ordre: number;
    defaultCollapse: boolean;
    banniere: string;
  } | null> {
    const sql = `
      SELECT 
        id,
        campagne_id AS campagneId,
        title,
        ordre,
        default_collapse AS defaultCollapse,
        banniere
      FROM sections
      WHERE id = ?
    `;

    interface RawSectionRow {
      id: number;
      campagneId: number | null;
      title: string;
      ordre: number;
      defaultCollapse: number;
      banniere: string | null;
    }

    const row = await queryOne<RawSectionRow>(sql, [sectionId]);
    if (!row) return null;

    return {
      id: row.id,
      campagneId: row.campagneId,
      title: row.title,
      ordre: row.ordre,
      defaultCollapse: Boolean(row.defaultCollapse),
      banniere: row.banniere || '',
    };
  }

  async createSection(data: {
    campagneId: number | null;
    title: string;
    ordre?: number;
    defaultCollapse?: boolean;
    banniere?: string;
  }): Promise<number> {
    let ordre = data.ordre;
    if (ordre === undefined || ordre === null) {
      const maxOrdre = await this.getMaxSectionOrdre(data.campagneId);
      ordre = maxOrdre + 1;
    }

    const sql = `
      INSERT INTO sections (campagne_id, title, ordre, default_collapse, banniere)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await execute(sql, [
      data.campagneId ?? null,
      data.title,
      ordre,
      data.defaultCollapse ? 1 : 0,
      data.banniere || '',
    ]);

    return result.insertId;
  }

  async updateSection(
    sectionId: number,
    data: { title?: string; defaultCollapse?: boolean; banniere?: string }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.defaultCollapse !== undefined) {
      fields.push('default_collapse = ?');
      values.push(data.defaultCollapse ? 1 : 0);
    }
    if (data.banniere !== undefined) {
      fields.push('banniere = ?');
      values.push(data.banniere);
    }

    if (fields.length === 0) return;

    values.push(sectionId);
    await execute(`UPDATE sections SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  async deleteSection(sectionId: number): Promise<void> {
    const topicRows = await query<{ id: number }>(`SELECT id FROM topics WHERE section_id = ?`, [sectionId]);
    for (const t of topicRows) {
      await this.deleteTopic(t.id);
    }
    await execute(`DELETE FROM sections WHERE id = ?`, [sectionId]);
  }

  async getMaxSectionOrdre(campagneId: number | null): Promise<number> {
    const isGeneral = campagneId === null || campagneId === undefined;
    const sql = `
      SELECT MAX(ordre) AS maxOrdre
      FROM sections
      WHERE ${isGeneral ? 'campagne_id IS NULL' : 'campagne_id = ?'}
    `;

    interface MaxOrdreRow {
      maxOrdre: number | null;
    }

    const row = await queryOne<MaxOrdreRow>(sql, isGeneral ? [] : [campagneId]);
    return Number(row?.maxOrdre || 0);
  }

  async reorderSections(campaignId: number, sectionIds: number[]): Promise<void> {
    const isGeneral = campaignId === 0 || campaignId === null || campaignId === undefined;
    for (let i = 0; i < sectionIds.length; i++) {
      const sectionId = sectionIds[i];
      const ordre = i + 1;
      if (isGeneral) {
        await execute(
          `UPDATE sections SET ordre = ? WHERE id = ? AND campagne_id IS NULL`,
          [ordre, sectionId]
        );
      } else {
        await execute(
          `UPDATE sections SET ordre = ? WHERE id = ? AND campagne_id = ?`,
          [ordre, sectionId, campaignId]
        );
      }
    }
  }

  async createTopic(data: {
    sectionId: number;
    title: string;
    stickable?: boolean;
    isPrivate?: number | boolean;
    isClosed?: boolean;
    ordre?: number;
    canReadUserIds?: number[];
  }): Promise<number> {
    let ordre = data.ordre;
    if (ordre === undefined || ordre === null) {
      const maxOrdre = await this.getMaxTopicOrdre(data.sectionId);
      ordre = maxOrdre + 1;
    }

    let isPrivateVal = 0;
    if (data.isPrivate === true || data.isPrivate === 1) {
      isPrivateVal = 1;
    } else if (data.isPrivate === 2) {
      isPrivateVal = 2;
    }

    const sql = `
      INSERT INTO topics (section_id, title, stickable, is_private, is_closed, ordre)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await execute(sql, [
      data.sectionId,
      data.title,
      data.stickable ? 1 : 0,
      isPrivateVal,
      data.isClosed ? 1 : 0,
      ordre,
    ]);

    const topicId = result.insertId;

    if (isPrivateVal === 1 && data.canReadUserIds && data.canReadUserIds.length > 0) {
      await this.setTopicCanReadUsers(topicId, data.canReadUserIds);
    }

    return topicId;
  }

  async updateTopic(
    topicId: number,
    data: {
      title?: string;
      stickable?: boolean;
      isPrivate?: number | boolean;
      isClosed?: boolean;
      canReadUserIds?: number[];
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.stickable !== undefined) {
      fields.push('stickable = ?');
      values.push(data.stickable ? 1 : 0);
    }
    if (data.isPrivate !== undefined) {
      let isPrivateVal = 0;
      if (data.isPrivate === true || data.isPrivate === 1) {
        isPrivateVal = 1;
      } else if (data.isPrivate === 2) {
        isPrivateVal = 2;
      }
      fields.push('is_private = ?');
      values.push(isPrivateVal);

      if (isPrivateVal === 1) {
        if (data.canReadUserIds !== undefined) {
          await this.setTopicCanReadUsers(topicId, data.canReadUserIds);
        }
      } else {
        await execute(`DELETE FROM can_read WHERE topic_id = ?`, [topicId]);
      }
    } else if (data.canReadUserIds !== undefined) {
      await this.setTopicCanReadUsers(topicId, data.canReadUserIds);
    }

    if (data.isClosed !== undefined) {
      fields.push('is_closed = ?');
      values.push(data.isClosed ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(topicId);
      await execute(`UPDATE topics SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async deleteTopic(topicId: number): Promise<void> {
    // Supprimer la référence last_post_id pour éviter la contrainte de clé étrangère
    await execute(`UPDATE topics SET last_post_id = NULL WHERE id = ?`, [topicId]);
    await execute(`DELETE FROM read_post WHERE topic_id = ?`, [topicId]);
    await execute(`DELETE FROM can_read WHERE topic_id = ?`, [topicId]);
    await execute(`DELETE FROM draft WHERE topic_id = ?`, [topicId]);
    await execute(`DELETE FROM posts WHERE topic_id = ?`, [topicId]);
    await execute(`DELETE FROM topics WHERE id = ?`, [topicId]);
  }

  async getTopicCanReadUsers(topicId: number): Promise<TopicUserSummary[]> {
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.avatar,
        u.profil
      FROM can_read cr
      JOIN user u ON cr.user_id = u.id
      WHERE cr.topic_id = ?
      ORDER BY u.username ASC
    `;

    interface RawCanReadUserRow {
      id: number;
      username: string;
      avatar: string | null;
      profil?: number | null;
    }

    const rows = await query<RawCanReadUserRow>(sql, [topicId]);
    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      avatar: r.avatar || '',
      profil: r.profil ?? 0,
    }));
  }

  async getCanReadUsersByTopicIds(topicIds: number[]): Promise<Map<number, TopicUserSummary[]>> {
    const result = new Map<number, TopicUserSummary[]>();
    if (topicIds.length === 0) return result;

    const placeholders = topicIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        cr.topic_id AS topicId,
        u.id,
        u.username,
        u.avatar,
        u.profil
      FROM can_read cr
      JOIN user u ON cr.user_id = u.id
      WHERE cr.topic_id IN (${placeholders})
      ORDER BY u.username ASC
    `;

    interface RawCanReadUsersRow {
      topicId: number;
      id: number;
      username: string;
      avatar: string | null;
      profil?: number | null;
    }

    const rows = await query<RawCanReadUsersRow>(sql, topicIds);
    for (const row of rows) {
      if (!result.has(row.topicId)) {
        result.set(row.topicId, []);
      }
      result.get(row.topicId)!.push({
        id: row.id,
        username: row.username,
        avatar: row.avatar || '',
        profil: row.profil ?? 0,
      });
    }
    return result;
  }

  async setTopicCanReadUsers(topicId: number, userIds: number[]): Promise<void> {
    await execute(`DELETE FROM can_read WHERE topic_id = ?`, [topicId]);

    const uniqueUserIds = Array.from(new Set(userIds)).filter((id) => id > 0);
    if (uniqueUserIds.length > 0) {
      const values = uniqueUserIds.map((userId) => `(${userId}, ${topicId})`).join(', ');
      await execute(`INSERT INTO can_read (user_id, topic_id) VALUES ${values}`);
    }
  }

  async isUserTopicCanRead(topicId: number, userId: number): Promise<boolean> {
    const sql = `
      SELECT 1 AS allowed
      FROM can_read
      WHERE topic_id = ? AND user_id = ?
      LIMIT 1
    `;

    interface CanReadCheckRow {
      allowed: number;
    }

    const row = await queryOne<CanReadCheckRow>(sql, [topicId, userId]);
    return Boolean(row?.allowed);
  }

  async getMaxTopicOrdre(sectionId: number): Promise<number> {
    const sql = `
      SELECT MAX(ordre) AS maxOrdre
      FROM topics
      WHERE section_id = ?
    `;

    interface MaxOrdreRow {
      maxOrdre: number | null;
    }

    const row = await queryOne<MaxOrdreRow>(sql, [sectionId]);
    return Number(row?.maxOrdre || 0);
  }

  async reorderTopics(campaignId: number, sections: Array<{ sectionId: number; topicIds: number[] }>): Promise<void> {
    const isGeneral = campaignId === 0 || campaignId === null || campaignId === undefined;
    for (const sec of sections) {
      for (let i = 0; i < sec.topicIds.length; i++) {
        const topicId = sec.topicIds[i];
        const ordre = i + 1;
        if (isGeneral) {
          await execute(
            `UPDATE topics t
             JOIN sections s ON t.section_id = s.id
             SET t.section_id = ?, t.ordre = ?
             WHERE t.id = ? AND s.campagne_id IS NULL`,
            [sec.sectionId, ordre, topicId]
          );
        } else {
          await execute(
            `UPDATE topics t
             JOIN sections s ON t.section_id = s.id
             SET t.section_id = ?, t.ordre = ?
             WHERE t.id = ? AND s.campagne_id = ?`,
            [sec.sectionId, ordre, topicId, campaignId]
          );
        }
      }
    }
  }
}

export const forumRepository: IForumRepository = new MysqlForumRepository();
