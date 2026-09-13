import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import { CampaignForumData, GeneralForumData, TopicDetail, CharacterSummary } from '../types/index.js';
import { CampaignNotFoundError, TopicNotFoundError } from '../errors/domain.errors.js';

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

    let userRole: 'mj' | 'player' | undefined = undefined;
    if (userId) {
      if (campaign.mjId === userId) {
        userRole = 'mj';
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, userId);
        if (isParticipant) {
          userRole = 'player';
        }
      }
    }

    const sections = await this.forumRepo.findSectionsByCampaignId(campaignId, userId);

    return {
      campaign: {
        ...campaign,
        userRole: userRole ?? campaign.userRole,
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

    const totalPosts = await this.forumRepo.countPostsByTopicId(topicId);
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));
    const lastReadPostId = userId ? await this.forumRepo.getUserLastReadPostId(topicId, userId) : null;

    let targetPage = 1;

    if (requestedPage !== undefined && requestedPage !== null && !isNaN(requestedPage)) {
      targetPage = Math.max(1, Math.min(requestedPage, totalPages));
    } else if (lastReadPostId !== null) {
      // Trouver la page contenant le dernier message lu
      const newerPostsCount = await this.forumRepo.countPostsAfterPostId(topicId, lastReadPostId);
      targetPage = Math.floor(newerPostsCount / pageSize) + 1;
      targetPage = Math.max(1, Math.min(targetPage, totalPages));
    } else {
      // Par défaut, la page 1 correspond aux 10 derniers messages
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

    if (userId && !isClosed) {
      if (topic.campagneId && topic.campagneId > 0) {
        const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, userId);
        if (isMj) {
          canPost = true;
          userRole = 'mj';
          availableCharacters = await this.forumRepo.findCampaignPersos(topic.campagneId);
        } else {
          const isParticipant = await this.forumRepo.isUserCampaignParticipant(topic.campagneId, userId);
          if (isParticipant) {
            canPost = true;
            userRole = 'player';
            availableCharacters = await this.forumRepo.findUserCampaignPersos(topic.campagneId, userId);
          }
        }
      } else {
        canPost = true;
        userRole = 'user';
        availableCharacters = [];
      }
    }

    return {
      id: topic.id,
      sectionId: topic.sectionId,
      sectionTitle: topic.sectionTitle,
      campagneId: topic.campagneId,
      campaignTitle: topic.campaignTitle || 'Forum Général',
      title: topic.title,
      stickable: Boolean(topic.stickable),
      isPrivate: Boolean(topic.isPrivate),
      isClosed,
      ordre: topic.ordre,
      totalPosts,
      page: targetPage,
      totalPages,
      pageSize,
      lastReadPostId: currentLastReadPostId,
      canPost,
      userRole,
      availableCharacters,
      posts: mappedPosts,
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
