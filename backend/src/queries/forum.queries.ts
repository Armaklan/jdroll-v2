import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import { CampaignForumData, GeneralForumData, TopicDetail, CharacterSummary, CampaignSummary, TopicUserSummary } from '../types/index.js';
import { CampaignNotFoundError, TopicNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

export class ForumQueries {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  /**
   * Récupère les données complètes du forum général (sections avec campagne_id IS NULL et topics avec statut de lecture)
   */
  async getGeneralForum(userId?: number): Promise<GeneralForumData> {
    const sections = await this.forumRepo.findSectionsByCampaignId(null, userId);

    return {
      sections,
    };
  }

  /**
   * Récupère les données complètes du forum d'une campagne (détails de la campagne, sections et topics avec statut de lecture)
   */
  async getCampaignForum(campaignId: number, userId?: number): Promise<CampaignForumData> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    let userRole: 'mj' | 'player' | 'observer' | undefined = undefined;
    let isObserving = false;
    if (userId) {
      if (campaign.mjId === userId) {
        userRole = 'mj';
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, userId);
        if (isParticipant) {
          userRole = 'player';
        } else {
          isObserving = await this.campaignRepo.isUserCampaignObserver(campaignId, userId);
          if (isObserving) {
            userRole = 'observer';
          }
        }
      }
    }

    const sections = await this.forumRepo.findSectionsByCampaignId(campaignId, userId);

    return {
      campaign: {
        ...campaign,
        userRole: userRole ?? campaign.userRole,
        isObserving: isObserving || campaign.isObserving,
      },
      sections,
    };
  }

  /**
   * Récupère les messages d'un topic avec pagination inversée (Page 1 = 10 derniers messages)
   * et résolution automatique de la page du dernier message lu si la page n'est pas spécifiée.
   */
  async getTopicPosts(topicId: number, requestedPage?: number, userId?: number): Promise<TopicDetail> {
    const topic = await this.forumRepo.findTopicById(topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${topicId} n'existe pas`);
    }

    let isPrivateVal = 0;
    const rawIsPrivate = Number(topic.isPrivate || 0);
    if (rawIsPrivate === 1) {
      isPrivateVal = 1;
    } else if (rawIsPrivate === 2) {
      isPrivateVal = 2;
    }

    if (isPrivateVal === 1) {
      if (!userId) {
        throw new ForbiddenError("Vous n'avez pas accès à ce sujet privé");
      }
      if (topic.campagneId && topic.campagneId > 0) {
        const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, userId);
        const isCanRead = isMj ? true : await this.forumRepo.isUserTopicCanRead(topic.id, userId);
        if (!isMj && !isCanRead) {
          throw new ForbiddenError("Vous n'avez pas accès à ce sujet privé");
        }
      } else {
        const isCanRead = await this.forumRepo.isUserTopicCanRead(topic.id, userId);
        if (!isCanRead) {
          throw new ForbiddenError("Vous n'avez pas accès à ce sujet privé");
        }
      }
    }

    const totalPosts = await this.forumRepo.countPostsByTopicId(topicId);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
    const lastReadPostId = userId ? await this.forumRepo.getUserLastReadPostId(topicId, userId) : null;

    let targetPage = 1;
    let firstUnreadPostId: number | null = null;
    let allRead = false;

    if (requestedPage !== undefined && requestedPage !== null && !isNaN(requestedPage)) {
      targetPage = Math.max(1, Math.min(requestedPage, totalPages));
      if (userId && lastReadPostId !== null) {
        const firstUnread = await this.forumRepo.findFirstUnreadPost(topicId, lastReadPostId);
        if (firstUnread) {
          firstUnreadPostId = firstUnread.id;
        } else {
          allRead = true;
        }
      }
    } else if (userId) {
      if (lastReadPostId !== null) {
        // Trouver le premier message non lu (id > lastReadPostId)
        const firstUnread = await this.forumRepo.findFirstUnreadPost(topicId, lastReadPostId);
        if (firstUnread) {
          firstUnreadPostId = firstUnread.id;
          const newerPostsCount = await this.forumRepo.countPostsAfterPostId(topicId, firstUnread.id);
          targetPage = Math.floor(newerPostsCount / pageSize) + 1;
          targetPage = Math.max(1, Math.min(targetPage, totalPages));
        } else {
          // Tous les messages ont été lus
          allRead = true;
          targetPage = 1;
        }
      } else {
        // L'utilisateur n'a jamais lu ce topic : le premier non lu est le premier post du topic
        const firstPost = await this.forumRepo.findFirstPost(topicId);
        if (firstPost) {
          firstUnreadPostId = firstPost.id;
          const newerPostsCount = await this.forumRepo.countPostsAfterPostId(topicId, firstPost.id);
          targetPage = Math.floor(newerPostsCount / pageSize) + 1;
          targetPage = Math.max(1, Math.min(targetPage, totalPages));
        } else {
          allRead = true;
          targetPage = 1;
        }
      }
    } else {
      // Par défaut pour les invités, la page 1 correspond aux 10 derniers messages
      targetPage = 1;
    }

    let offset = 0;
    let limit = 0;

    if (totalPosts > 0) {
      offset = Math.max(0, totalPosts - targetPage * pageSize);
      limit = Math.min(pageSize, totalPosts - (targetPage - 1) * pageSize);
    }

    const posts = await this.forumRepo.findPostsByTopicId(topicId, offset, limit, userId);

    let currentLastReadPostId = lastReadPostId;

    if (userId && posts.length > 0) {
      const lastVisiblePost = posts[posts.length - 1];
      if (lastVisiblePost) {
        await this.forumRepo.markTopicAsRead(topicId, userId, lastVisiblePost.id);
        currentLastReadPostId =
          currentLastReadPostId !== null
            ? Math.max(currentLastReadPostId, lastVisiblePost.id)
            : lastVisiblePost.id;
      }
    }

    const mappedPosts = posts.map((p) => ({
      ...p,
      isRead: userId ? (currentLastReadPostId !== null && p.id <= currentLastReadPostId) : true,
    }));

    let canPost = false;
    let userRole: 'mj' | 'player' | 'user' | null = null;
    let availableCharacters: CharacterSummary[] = [];

    const isClosed = Boolean(topic.isClosed);

    if (userId) {
      if (topic.campagneId && topic.campagneId > 0) {
        const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, userId);
        let isParticipant = false;
        if (isMj) {
          userRole = 'mj';
          availableCharacters = await this.forumRepo.findCampaignPersos(topic.campagneId);
        } else {
          isParticipant = await this.forumRepo.isUserCampaignParticipant(topic.campagneId, userId);
          if (isParticipant) {
            userRole = 'player';
            availableCharacters = await this.forumRepo.findUserCampaignPersos(topic.campagneId, userId);
          }
        }

        if (!isClosed) {
          if (isPrivateVal === 1) {
            const isCanRead = isMj ? true : await this.forumRepo.isUserTopicCanRead(topic.id, userId);
            if (isMj || isCanRead) canPost = true;
          } else if (isPrivateVal === 0) {
            if (isMj || isParticipant) canPost = true;
          } else if (isPrivateVal === 2) {
            canPost = true;
          }
        }
      } else {
        userRole = 'user';
        availableCharacters = [];
        if (!isClosed) {
          if (isPrivateVal === 1) {
            const isCanRead = await this.forumRepo.isUserTopicCanRead(topic.id, userId);
            if (isCanRead) canPost = true;
          } else {
            canPost = true;
          }
        }
      }
    }

    let campaign: CampaignSummary | null = null;
    if (topic.campagneId && topic.campagneId > 0) {
      const foundCampaign = await this.campaignRepo.findById(topic.campagneId);
      if (foundCampaign) {
        campaign = {
          ...foundCampaign,
          userRole: userRole === 'mj' || userRole === 'player' ? userRole : foundCampaign.userRole,
        };
      }
    }

    let canReadUsers: TopicUserSummary[] | undefined = undefined;
    if (isPrivateVal === 1) {
      canReadUsers = await this.forumRepo.getTopicCanReadUsers(topic.id);
    }

    return {
      id: topic.id,
      sectionId: topic.sectionId,
      sectionTitle: topic.sectionTitle,
      campagneId: topic.campagneId,
      campaignTitle: topic.campaignTitle || 'Forum Général',
      title: topic.title,
      stickable: Boolean(topic.stickable),
      isPrivate: isPrivateVal,
      isClosed,
      ordre: topic.ordre,
      totalPosts,
      page: targetPage,
      totalPages,
      pageSize,
      lastReadPostId: currentLastReadPostId,
      firstUnreadPostId,
      allRead,
      canPost,
      userRole,
      availableCharacters,
      posts: mappedPosts,
      campaign,
      canReadUsers,
      canReadUserIds: canReadUsers ? canReadUsers.map((u) => u.id) : undefined,
      dialogueColor: topic.dialogueColor || null,
      penseeColor: topic.penseeColor || null,
      rp1Color: topic.rp1Color || null,
      rp2Color: topic.rp2Color || null,
      quoteColor: topic.quoteColor || null,
      sidebarColor: topic.sidebarColor || null,
      oddLineColor: topic.oddLineColor || null,
      evenLineColor: topic.evenLineColor || null,
      textColor: topic.textColor || null,
      linkColor: topic.linkColor || null,
      linkSidebarColor: topic.linkSidebarColor || null,
    };
  }
}

export const forumQueries = new ForumQueries();
