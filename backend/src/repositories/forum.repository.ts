import { query, queryOne } from '../db/mysql.js';
import {
  ForumSectionSummary,
  ForumTopicSummary,
  ForumLastPost,
  ForumPost,
  RawTopicDetail,
} from '../types/index.js';

export interface IForumRepository {
  findSectionsByCampaignId(campaignId: number, userId?: number): Promise<ForumSectionSummary[]>;
  findTopicById(topicId: number): Promise<RawTopicDetail | null>;
  countPostsByTopicId(topicId: number): Promise<number>;
  findPostsByTopicId(topicId: number, offset: number, limit: number, userId?: number): Promise<ForumPost[]>;
  getUserLastReadPostId(topicId: number, userId: number): Promise<number | null>;
  countPostsAfterPostId(topicId: number, postId: number): Promise<number>;
}

export class MysqlForumRepository implements IForumRepository {
  async findSectionsByCampaignId(campaignId: number, userId?: number): Promise<ForumSectionSummary[]> {
    const sectionsSql = `
      SELECT 
        id,
        campagne_id AS campagneId,
        title,
        ordre,
        default_collapse AS defaultCollapse,
        banniere
      FROM sections
      WHERE campagne_id = ?
      ORDER BY ordre ASC, id ASC
    `;

    interface RawSectionRow {
      id: number;
      campagneId: number;
      title: string;
      ordre: number;
      defaultCollapse: number;
      banniere: string | null;
    }

    const sectionRows = await query<RawSectionRow>(sectionsSql, [campaignId]);

    if (sectionRows.length === 0) {
      return [];
    }

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
        p.perso_id AS lastPostPersoId,
        rp.post_id AS userLastReadPostId,
        (SELECT COUNT(*) FROM posts count_p WHERE count_p.topic_id = t.id) AS postsCount
      FROM topics t
      JOIN sections s ON t.section_id = s.id
      LEFT JOIN posts p ON t.last_post_id = p.id
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN read_post rp ON rp.topic_id = t.id AND rp.user_id = ?
      WHERE s.campagne_id = ?
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
      lastPostPersoId: number | null;
      userLastReadPostId: number | null;
      postsCount: number;
    }

    const topicRows = await query<RawTopicRow>(topicsSql, [userId ?? 0, campaignId]);

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
          persoId: row.lastPostPersoId ?? null,
        };
      }

      const topic: ForumTopicSummary = {
        id: row.id,
        sectionId: row.sectionId,
        title: row.title,
        stickable: Boolean(row.stickable),
        isPrivate: Boolean(row.isPrivate),
        isClosed: Boolean(row.isClosed),
        ordre: row.ordre,
        postsCount: Number(row.postsCount || 0),
        lastPost,
        isRead,
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
        c.name AS campaignTitle,
        t.title,
        t.stickable,
        t.is_private AS isPrivate,
        t.is_closed AS isClosed,
        t.ordre
      FROM topics t
      JOIN sections s ON t.section_id = s.id
      JOIN campagne c ON s.campagne_id = c.id
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
        perso.name AS persoName,
        perso.concept AS persoConcept,
        perso.avatar AS persoAvatar,
        perso.publicDescription AS persoPublicDescription,
        rp.post_id AS userLastReadPostId
      FROM posts p
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN personnages perso ON p.perso_id = perso.id
      LEFT JOIN read_post rp ON rp.topic_id = p.topic_id AND rp.user_id = ?
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
      persoName: string | null;
      persoConcept: string | null;
      persoAvatar: string | null;
      persoPublicDescription: string | null;
      userLastReadPostId: number | null;
    }

    const rows = await query<RawPostRow>(sql, [userId ?? 0, topicId, limit, offset]);

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
              name: row.persoName ?? '',
              concept: row.persoConcept ?? '',
              avatar: row.persoAvatar ?? '',
              publicDescription: row.persoPublicDescription ?? '',
            }
          : null,
        isRead,
      };
    });
  }

  async getUserLastReadPostId(topicId: number, userId: number): Promise<number | null> {
    const sql = `
      SELECT post_id AS postId
      FROM read_post
      WHERE topic_id = ? AND user_id = ?
      LIMIT 1
    `;

    interface ReadPostRow {
      postId: number;
    }

    const row = await queryOne<ReadPostRow>(sql, [topicId, userId]);
    return row ? row.postId : null;
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
}

export const forumRepository: IForumRepository = new MysqlForumRepository();
