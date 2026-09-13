import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForumQueries } from './forum.queries.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import {
  CampaignSummary,
  ForumSectionSummary,
  ForumPost,
  RawTopicDetail,
  CharacterSummary,
} from '../types/index.js';
import { CampaignNotFoundError, TopicNotFoundError } from '../errors/domain.errors.js';

const mockCampaign: CampaignSummary = {
  id: 1,
  name: 'La Malédiction de Strahd',
  mjId: 1,
  mjUsername: 'admin',
  mjAvatar: '',
  nbJoueurs: 4,
  nbJoueursActuel: 2,
  banniere: '',
  systeme: 'D&D 5e',
  univers: 'Ravenloft',
  description: 'Aventure d’épouvante',
  statut: 0,
  isArchived: false,
  isRecrutementOpen: true,
};

const mockSections: ForumSectionSummary[] = [
  {
    id: 10,
    campagneId: 1,
    title: 'Général & Règles',
    ordre: 1,
    defaultCollapse: false,
    banniere: '',
    topics: [
      {
        id: 101,
        sectionId: 10,
        title: 'Règles de la table',
        stickable: true,
        isPrivate: false,
        isClosed: false,
        ordre: 1,
        postsCount: 5,
        lastPost: {
          id: 50,
          createDate: '2026-09-13T10:00:00.000Z',
          userId: 1,
          username: 'admin',
        },
        isRead: true,
      },
      {
        id: 102,
        sectionId: 10,
        title: 'Présentation des joueurs',
        stickable: false,
        isPrivate: false,
        isClosed: false,
        ordre: 2,
        postsCount: 12,
        lastPost: {
          id: 75,
          createDate: '2026-09-13T14:30:00.000Z',
          userId: 2,
          username: 'testuser',
        },
        isRead: false,
      },
    ],
  },
  {
    id: 20,
    campagneId: 1,
    title: 'Aventure en jeu (RP)',
    ordre: 2,
    defaultCollapse: false,
    banniere: '',
    topics: [],
  },
];

const mockTopic: RawTopicDetail = {
  id: 101,
  sectionId: 10,
  sectionTitle: 'Général & Règles',
  campagneId: 1,
  campaignTitle: 'La Malédiction de Strahd',
  title: 'Règles de la table',
  stickable: 1,
  isPrivate: 0,
  isClosed: 0,
  ordre: 1,
};

// 25 posts simulés (id 1 à 25)
const generateMockPosts = (count: number): ForumPost[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    topicId: 101,
    content: `Message numéro ${i + 1}`,
    createDate: new Date(2026, 8, 1, 10, i).toISOString(),
    editor: 0,
    user: {
      id: (i % 2) + 1,
      username: i % 2 === 0 ? 'admin' : 'testuser',
      avatar: '',
      profil: i % 2 === 0 ? 1 : 0,
      titre: i % 2 === 0 ? 'MJ' : 'Joueur',
    },
    perso:
      i % 2 === 1
        ? {
            id: 1,
            name: 'Kaelen',
            concept: 'Mage',
            avatar: '',
            publicDescription: 'Un mage',
          }
        : null,
    isRead: true,
  }));
};

class MockCampaignRepository implements ICampaignRepository {
  constructor(private campaign: CampaignSummary | null = mockCampaign) {}

  async findMasteredCampaigns(): Promise<CampaignSummary[]> {
    return this.campaign ? [this.campaign] : [];
  }
  async findPlayerCampaigns(): Promise<CampaignSummary[]> {
    return this.campaign ? [this.campaign] : [];
  }
  async findAllCampaigns(): Promise<CampaignSummary[]> {
    return this.campaign ? [this.campaign] : [];
  }
  async findById(id: number): Promise<CampaignSummary | null> {
    if (this.campaign && this.campaign.id === id) {
      return this.campaign;
    }
    return null;
  }
}

class MockForumRepository implements IForumRepository {
  public allPosts: ForumPost[] = [];
  public lastReadPostId: number | null = null;

  constructor(
    private sections: ForumSectionSummary[] = mockSections,
    private topic: RawTopicDetail | null = mockTopic,
    postsCount = 0,
    lastReadPostId: number | null = null
  ) {
    this.allPosts = generateMockPosts(postsCount);
    this.lastReadPostId = lastReadPostId;
  }

  async findSectionsByCampaignId(campaignId: number, _userId?: number): Promise<ForumSectionSummary[]> {
    return this.sections.filter((s) => s.campagneId === campaignId);
  }

  async findTopicById(topicId: number): Promise<RawTopicDetail | null> {
    if (this.topic && this.topic.id === topicId) {
      return this.topic;
    }
    return null;
  }

  async countPostsByTopicId(_topicId: number): Promise<number> {
    return this.allPosts.length;
  }

  async findPostsByTopicId(
    _topicId: number,
    offset: number,
    limit: number,
    _userId?: number
  ): Promise<ForumPost[]> {
    return this.allPosts.slice(offset, offset + limit);
  }

  async getUserLastReadPostId(_topicId: number, _userId: number): Promise<number | null> {
    return this.lastReadPostId;
  }

  async countPostsAfterPostId(_topicId: number, postId: number): Promise<number> {
    return this.allPosts.filter((p) => p.id > postId).length;
  }

  async getPostById(postId: number): Promise<ForumPost | null> {
    return this.allPosts.find((p) => p.id === postId) || null;
  }

  async createPost(data: any): Promise<number> {
    const id = this.allPosts.length + 1;
    return id;
  }

  async updateTopicLastPost(): Promise<void> {}

  async markTopicAsRead(): Promise<void> {}

  async findCampaignPersos(): Promise<CharacterSummary[]> {
    return [
      { id: 1, name: 'Kaelen', concept: 'Mage', avatar: '', userId: 2, campagneId: 1 },
      { id: 2, name: 'Aubergiste', concept: 'PNJ', avatar: '', userId: null, campagneId: 1 },
    ];
  }

  async findUserCampaignPersos(): Promise<CharacterSummary[]> {
    return [{ id: 1, name: 'Kaelen', concept: 'Mage', avatar: '', userId: 2, campagneId: 1 }];
  }

  async isUserCampaignMj(_campagneId: number, userId: number): Promise<boolean> {
    return userId === 1;
  }

  async isUserCampaignParticipant(_campagneId: number, userId: number): Promise<boolean> {
    return userId === 2;
  }

  async findPersoById(persoId: number): Promise<CharacterSummary | null> {
    if (persoId === 1) {
      return { id: 1, name: 'Kaelen', concept: 'Mage', avatar: '', userId: 2, campagneId: 1 };
    }
    return null;
  }
}

describe('ForumQueries', () => {
  it('should throw CampaignNotFoundError if campaign does not exist', async () => {
    const campaignRepo = new MockCampaignRepository(null);
    const forumRepo = new MockForumRepository();
    const queries = new ForumQueries(campaignRepo, forumRepo);

    await assert.rejects(
      () => queries.getCampaignForum(999, 1),
      (err: any) => err instanceof CampaignNotFoundError
    );
  });

  it('should return campaign details and sections with topics when campaign exists', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getCampaignForum(1, 2);

    assert.equal(result.campaign.id, 1);
    assert.equal(result.campaign.name, 'La Malédiction de Strahd');
    assert.equal(result.sections.length, 2);
    assert.equal(result.sections[0].topics.length, 2);
    assert.equal(result.sections[0].topics[0].isRead, true);
    assert.equal(result.sections[0].topics[1].isRead, false);
    assert.equal(result.sections[0].topics[1].lastPost?.username, 'testuser');
  });

  it('should support unauthenticated guest queries (userId undefined)', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getCampaignForum(1);

    assert.equal(result.campaign.id, 1);
    assert.equal(result.sections.length, 2);
  });

  it('should throw TopicNotFoundError if topic does not exist', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    await assert.rejects(
      () => queries.getTopicPosts(999),
      (err: any) => err instanceof TopicNotFoundError
    );
  });

  it('should return page 1 with the 10 most recent posts (indices 15..24) for 25 posts', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 1);

    assert.equal(result.totalPosts, 25);
    assert.equal(result.totalPages, 3);
    assert.equal(result.page, 1);
    assert.equal(result.posts.length, 10);
    assert.equal(result.posts[0].id, 16);
    assert.equal(result.posts[9].id, 25);
  });

  it('should return page 2 with posts 6 to 15 for 25 posts', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 2);

    assert.equal(result.page, 2);
    assert.equal(result.posts.length, 10);
    assert.equal(result.posts[0].id, 6);
    assert.equal(result.posts[9].id, 15);
  });

  it('should return page 3 with posts 1 to 5 for 25 posts', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 3);

    assert.equal(result.page, 3);
    assert.equal(result.posts.length, 5);
    assert.equal(result.posts[0].id, 1);
    assert.equal(result.posts[4].id, 5);
  });

  it('should automatically open the page containing the last read post when page is not specified', async () => {
    // 25 posts au total, l'utilisateur a lu jusqu'au post #12 (il reste 13 posts après #12)
    // 13 posts après -> floor(13 / 10) + 1 = page 2
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, 12);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, undefined, 2);

    assert.equal(result.page, 2);
    assert.equal(result.lastReadPostId, 12);
    assert.equal(result.posts[0].id, 6);
    assert.equal(result.posts[9].id, 15);
  });

  it('should automatically open page 1 if all posts are read', async () => {
    // Lu jusqu'au post #25 (0 posts après -> page 1)
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, 25);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, undefined, 2);

    assert.equal(result.page, 1);
    assert.equal(result.posts[0].id, 16);
    assert.equal(result.posts[9].id, 25);
  });

  it('should handle topics with 0 posts gracefully', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 0, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101);

    assert.equal(result.totalPosts, 0);
    assert.equal(result.totalPages, 1);
    assert.equal(result.page, 1);
    assert.equal(result.posts.length, 0);
    assert.equal(result.canPost, false);
  });

  it('should return canPost=true with userRole=mj and all campaign characters for GM user', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 5, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 1, 1); // User 1 = MJ

    assert.equal(result.canPost, true);
    assert.equal(result.userRole, 'mj');
    assert.equal(result.availableCharacters.length, 2);
  });

  it('should return canPost=true with userRole=player and assigned characters for Player user', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 5, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 1, 2); // User 2 = Player

    assert.equal(result.canPost, true);
    assert.equal(result.userRole, 'player');
    assert.equal(result.availableCharacters.length, 1);
    assert.equal(result.availableCharacters[0].name, 'Kaelen');
  });

  it('should return canPost=false for non-participating user in a campaign topic', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 5, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 1, 999); // User 999 = non participant

    assert.equal(result.canPost, false);
    assert.equal(result.userRole, null);
    assert.equal(result.availableCharacters.length, 0);
  });
});
