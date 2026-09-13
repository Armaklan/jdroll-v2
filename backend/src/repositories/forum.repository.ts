import { query } from '../db/mysql.js';
import { ForumSectionSummary, ForumTopicSummary, ForumLastPost } from '../types/index.js';

export interface IForumRepository {
  findSectionsByCampaignId(campaignId: number, userId?: number): Promise<ForumSectionSummary[]>;
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
}

export const forumRepository: IForumRepository = new MysqlForumRepository();
