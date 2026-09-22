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
  TopicUserSummary,
} from '../types/index.js';
import { CampaignNotFoundError, TopicNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

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
  dialogueColor: '#112233',
  penseeColor: '#445566',
  rp1Color: '#778899',
  rp2Color: '#aabbcc',
  sidebarColor: '#123456',
  oddLineColor: '#234567',
  evenLineColor: '#345678',
  textColor: '#456789',
  linkColor: '#56789a',
  linkSidebarColor: '#6789ab',
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
  dialogueColor: '#112233',
  penseeColor: '#445566',
  rp1Color: '#778899',
  rp2Color: '#aabbcc',
  sidebarColor: '#123456',
  oddLineColor: '#234567',
  evenLineColor: '#345678',
  textColor: '#456789',
  linkColor: '#56789a',
  linkSidebarColor: '#6789ab',
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
  async findCampaignCharacters(): Promise<any[]> {
    return [];
  }
  async findCampaignPnjCategories(): Promise<any[]> {
    return [];
  }
  async findCharacterById(): Promise<any> {
    return null;
  }
  async createCharacter(): Promise<number> {
    return 1;
  }
  async updateCharacter(): Promise<void> {}
  async createCampaign(): Promise<number> {
    return 1;
  }
  async updateCampaign(): Promise<void> {}
  async updateCampaignBanner(): Promise<void> {}
  async findCampaignParticipants(): Promise<any[]> {
    return [];
  }
  async isUserCampaignParticipant(): Promise<boolean> {
    return false;
  }
  async addCampaignParticipant(): Promise<void> {}
  async findObservedCampaigns(): Promise<CampaignSummary[]> {
    return [];
  }
  async isUserCampaignObserver(): Promise<boolean> {
    return false;
  }
  async addCampaignObserver(): Promise<void> {}
  async removeCampaignObserver(): Promise<void> {}
  async findCampaignObservers(): Promise<any[]> {
    return [];
  }
  async isUserCampaignAlert(): Promise<boolean> {
    return false;
  }
  async addCampaignAlert(): Promise<void> {}
  async removeCampaignAlert(): Promise<void> {}
}

class MockForumRepository implements IForumRepository {
  public allPosts: ForumPost[] = [];
  public lastReadPostId: number | null = null;
  public markTopicAsReadCalls: Array<{ topicId: number; userId: number; postId: number }> = [];

  constructor(
    private sections: ForumSectionSummary[] = mockSections,
    private topic: RawTopicDetail | null = mockTopic,
    postsCount = 0,
    lastReadPostId: number | null = null,
    customPosts?: ForumPost[]
  ) {
    this.allPosts = customPosts || generateMockPosts(postsCount);
    this.lastReadPostId = lastReadPostId;
  }

  async findSectionsByCampaignId(campaignId: number | null, _userId?: number): Promise<ForumSectionSummary[]> {
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

  async findFirstUnreadPost(_topicId: number, lastReadPostId: number): Promise<{ id: number } | null> {
    const unread = this.allPosts.filter((p) => p.id > lastReadPostId).sort((a, b) => a.id - b.id);
    return unread.length > 0 ? { id: unread[0].id } : null;
  }

  async findFirstPost(_topicId: number): Promise<{ id: number } | null> {
    return this.allPosts.length > 0 ? { id: this.allPosts[0].id } : null;
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

  async markTopicAsRead(topicId: number, userId: number, postId: number): Promise<void> {
    this.markTopicAsReadCalls.push({ topicId, userId, postId });
    if (this.lastReadPostId === null || postId > this.lastReadPostId) {
      this.lastReadPostId = postId;
    }
  }

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

  async findSectionById(sectionId: number): Promise<any> {
    const found = this.sections.find((s) => s.id === sectionId);
    if (!found) return null;
    return {
      id: found.id,
      campagneId: found.campagneId,
      title: found.title,
      ordre: found.ordre,
      defaultCollapse: found.defaultCollapse,
      banniere: found.banniere || '',
    };
  }

  async createSection(data: any): Promise<number> {
    return 1;
  }

  async updateSection(sectionId: number, data: any): Promise<void> {}

  async getMaxSectionOrdre(): Promise<number> {
    return 0;
  }

  async reorderSections(): Promise<void> {}

  async createTopic(): Promise<number> {
    return 1;
  }

  async updateTopic(topicId: number, data: any): Promise<void> {}

  async getMaxTopicOrdre(): Promise<number> {
    return 0;
  }

  async reorderTopics(): Promise<void> {}

  async findPersoById(persoId: number): Promise<CharacterSummary | null> {
    if (persoId === 1) {
      return { id: 1, name: 'Kaelen', concept: 'Mage', avatar: '', userId: 2, campagneId: 1 };
    }
    return null;
  }

  async getTopicCanReadUsers(topicId: number): Promise<TopicUserSummary[]> {
    if (topicId === 101 || topicId === 301) {
      return [{ id: 2, username: 'testuser', avatar: '' }];
    }
    return [];
  }

  async getCanReadUsersByTopicIds(topicIds: number[]): Promise<Map<number, TopicUserSummary[]>> {
    const map = new Map<number, TopicUserSummary[]>();
    for (const id of topicIds) {
      if (id === 101 || id === 301) {
        map.set(id, [{ id: 2, username: 'testuser', avatar: '' }]);
      }
    }
    return map;
  }

  async deleteSection(sectionId: number): Promise<void> {}

  async deleteTopic(topicId: number): Promise<void> {}

  async updatePost(postId: number, data: any): Promise<void> {}

  async deletePost(postId: number): Promise<void> {}

  async findLastPost(topicId: number): Promise<any> {
    return null;
  }

  async setTopicCanReadUsers(): Promise<void> {}

  async isUserTopicCanRead(topicId: number, userId: number): Promise<boolean> {
    return (topicId === 101 || topicId === 301) && userId === 2;
  }

  async findDraft(topicId: number, userId: number): Promise<any> {
    if (topicId === 101 && userId === 2) {
      return {
        id: 1,
        topicId: 101,
        userId: 2,
        persoId: 1,
        content: '<p>Brouillon test</p>',
      };
    }
    return null;
  }

  async saveDraft(data: any): Promise<any> {
    return { id: 1, ...data };
  }

  async deleteDraft(_topicId: number, _userId: number): Promise<void> {}
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
    assert.equal(result.campaign.dialogueColor, '#112233');
    assert.equal(result.campaign.penseeColor, '#445566');
    assert.equal(result.campaign.rp1Color, '#778899');
    assert.equal(result.campaign.rp2Color, '#aabbcc');
    assert.equal(result.campaign.sidebarColor, '#123456');
    assert.equal(result.campaign.oddLineColor, '#234567');
    assert.equal(result.campaign.evenLineColor, '#345678');
    assert.equal(result.campaign.textColor, '#456789');
    assert.equal(result.campaign.linkColor, '#56789a');
    assert.equal(result.campaign.linkSidebarColor, '#6789ab');
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
    assert.equal(result.dialogueColor, '#112233');
    assert.equal(result.penseeColor, '#445566');
    assert.equal(result.rp1Color, '#778899');
    assert.equal(result.rp2Color, '#aabbcc');
    assert.equal(result.sidebarColor, '#123456');
    assert.equal(result.oddLineColor, '#234567');
    assert.equal(result.evenLineColor, '#345678');
    assert.equal(result.textColor, '#456789');
    assert.equal(result.linkColor, '#56789a');
    assert.equal(result.linkSidebarColor, '#6789ab');
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

  it('should automatically open the page containing the first unread post when page is not specified and update read marker with last visible post', async () => {
    // 25 posts au total, l'utilisateur a lu jusqu'au post #12 (il reste 13 posts après #12)
    // 1er non lu = #13. 12 posts après #13 -> floor(12 / 10) + 1 = page 2 (posts 6 à 15)
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, 12);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, undefined, 2);

    assert.equal(result.page, 2);
    assert.equal(result.firstUnreadPostId, 13);
    assert.equal(result.allRead, false);
    // Le dernier post visible sur la page 2 est le #15, qui devient le nouveau lastReadPostId
    assert.equal(result.lastReadPostId, 15);
    assert.equal(result.posts[0].id, 6);
    assert.equal(result.posts[9].id, 15);
    assert.equal(result.posts.every((p) => p.isRead), true);
    assert.equal(forumRepo.markTopicAsReadCalls.length, 1);
    assert.deepEqual(forumRepo.markTopicAsReadCalls[0], { topicId: 101, userId: 2, postId: 15 });
  });

  it('should automatically open page 3 (first post #1) when opening a topic for the first time without page specified', async () => {
    // Utilisateur sans historique de lecture (null), le 1er non lu est le post #1 (page 3)
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, undefined, 2);

    assert.equal(result.page, 3);
    assert.equal(result.firstUnreadPostId, 1);
    assert.equal(result.allRead, false);
    assert.equal(result.lastReadPostId, 5);
    assert.equal(result.posts[0].id, 1);
    assert.equal(result.posts[4].id, 5);
    assert.equal(result.posts.every((p) => p.isRead), true);
    assert.equal(forumRepo.markTopicAsReadCalls.length, 1);
    assert.deepEqual(forumRepo.markTopicAsReadCalls[0], { topicId: 101, userId: 2, postId: 5 });
  });

  it('should automatically mark last visible post as read when opening a topic on page 1 explicitly', async () => {
    // Utilisateur sans historique de lecture (null), ouvre la page 1 explicitement (posts 16 à 25)
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 1, 2);

    assert.equal(result.page, 1);
    assert.equal(result.lastReadPostId, 25);
    assert.equal(result.posts[9].id, 25);
    assert.equal(result.posts.every((p) => p.isRead), true);
    assert.equal(forumRepo.markTopicAsReadCalls.length, 1);
    assert.deepEqual(forumRepo.markTopicAsReadCalls[0], { topicId: 101, userId: 2, postId: 25 });
  });

  it('should not regress lastReadPostId when opening an older history page', async () => {
    // Utilisateur a déjà lu jusqu'au post #20, mais consulte la page 3 (posts 1 à 5)
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, 20);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 3, 2);

    assert.equal(result.page, 3);
    assert.equal(result.lastReadPostId, 20); // Doit rester à 20 car 20 > 5
    assert.equal(result.posts[4].id, 5);
    assert.equal(result.posts.every((p) => p.isRead), true);
    assert.equal(forumRepo.markTopicAsReadCalls.length, 1);
    assert.deepEqual(forumRepo.markTopicAsReadCalls[0], { topicId: 101, userId: 2, postId: 5 });
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
    assert.equal(result.lastReadPostId, 25);
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

  it('should return all posts in chronological order (oldest first) when page is 0', async () => {
    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 25, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(101, 0);

    assert.equal(result.totalPosts, 25);
    assert.equal(result.page, 0);
    assert.equal(result.posts.length, 25);
    // Should be in chronological order: oldest (id=1) first, newest (id=25) last
    assert.equal(result.posts[0].id, 1);
    assert.equal(result.posts[24].id, 25);
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

  it('should return general forum sections when getGeneralForum is called', async () => {
    const generalSections: ForumSectionSummary[] = [
      {
        id: 100,
        campagneId: null,
        title: 'Taverne & Annonces',
        ordre: 1,
        defaultCollapse: false,
        banniere: '',
        topics: [
          {
            id: 201,
            sectionId: 100,
            title: 'Bienvenue sur JdRoll 2.0',
            stickable: true,
            isPrivate: false,
            isClosed: false,
            ordre: 1,
            postsCount: 3,
            lastPost: {
              id: 99,
              createDate: '2026-09-13T10:00:00.000Z',
              userId: 1,
              username: 'admin',
            },
            isRead: true,
          },
        ],
      },
    ];

    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(generalSections, mockTopic, 5, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getGeneralForum(1);

    assert.equal(result.sections.length, 1);
    assert.equal(result.sections[0].id, 100);
    assert.equal(result.sections[0].campagneId, null);
    assert.equal(result.sections[0].topics.length, 1);
    assert.equal(result.sections[0].topics[0].title, 'Bienvenue sur JdRoll 2.0');
  });

  it('should allow any authenticated user to post in general forum without characters', async () => {
    const generalTopic: RawTopicDetail = {
      id: 201,
      sectionId: 100,
      sectionTitle: 'Taverne & Annonces',
      campagneId: null,
      campaignTitle: null,
      title: 'Bienvenue sur JdRoll 2.0',
      stickable: 1,
      isPrivate: 0,
      isClosed: 0,
      ordre: 1,
    };

    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository([], generalTopic, 5, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    const result = await queries.getTopicPosts(201, 1, 999); // Any user 999

    assert.equal(result.canPost, true);
    assert.equal(result.userRole, 'user');
    assert.equal(result.availableCharacters.length, 0);
    assert.equal(result.campaignTitle, 'Forum Général');
  });

  it('gère correctement les droits d accès et les utilisateurs autorisés sur un sujet privé', async () => {
    const privateTopic: RawTopicDetail = {
      id: 301,
      sectionId: 10,
      sectionTitle: 'Général & Règles',
      campagneId: 1,
      campaignTitle: 'La Malédiction de Strahd',
      title: 'Secret de campagne',
      stickable: 0,
      isPrivate: 1,
      isClosed: 0,
      ordre: 1,
    };

    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, privateTopic, 2, null);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    // Accès anonyme -> ForbiddenError
    await assert.rejects(
      () => queries.getTopicPosts(301, 1, undefined),
      (err: any) => err instanceof ForbiddenError
    );

    // Accès non autorisé (User 999) -> ForbiddenError
    await assert.rejects(
      () => queries.getTopicPosts(301, 1, 999),
      (err: any) => err instanceof ForbiddenError
    );

    // Accès MJ (User 1) -> OK
    const mjResult = await queries.getTopicPosts(301, 1, 1);
    assert.equal(mjResult.isPrivate, 1);
    assert.equal(mjResult.canPost, true);

    // Accès joueur autorisé (User 2) -> OK
    const playerResult = await queries.getTopicPosts(301, 1, 2);
    assert.equal(playerResult.isPrivate, 1);
    assert.equal(playerResult.canPost, true);
  });

  it('gère la visibilité des widgets des personnages dans les messages du forum', async () => {
    const postWithPerso1: ForumPost = {
      id: 501,
      topicId: 101,
      content: 'Bonjour',
      createDate: '2026-09-16T12:00:00.000Z',
      editor: 0,
      user: { id: 2, username: 'player1', avatar: '', profil: 0 },
      perso: {
        id: 10,
        userId: 2,
        name: 'Guerrier',
        concept: 'Combattant',
        avatar: '',
        publicDescription: '',
        widgets: '[{"id":"w1","name":"PV","type":"jauge","value":15,"low":0,"up":20}]',
      },
      isRead: true,
    };

    const postWithPerso2: ForumPost = {
      id: 502,
      topicId: 101,
      content: 'Salut',
      createDate: '2026-09-16T12:05:00.000Z',
      editor: 0,
      user: { id: 3, username: 'player2', avatar: '', profil: 0 },
      perso: {
        id: 20,
        userId: 3,
        name: 'Mage',
        concept: 'Arcaniste',
        avatar: '',
        publicDescription: '',
        widgets: '[{"id":"w2","name":"Mana","type":"jauge","value":8,"low":0,"up":10}]',
      },
      isRead: true,
    };

    const campaignRepo = new MockCampaignRepository(mockCampaign);
    const forumRepo = new MockForumRepository(mockSections, mockTopic, 2, null, [postWithPerso1, postWithPerso2]);
    const queries = new ForumQueries(campaignRepo, forumRepo);

    // 1. En tant que MJ (User 1) : voit les widgets de tous les personnages
    const mjResult = await queries.getTopicPosts(101, 1, 1);
    assert.ok(mjResult.posts[0].perso?.widgets);
    assert.ok(mjResult.posts[1].perso?.widgets);

    // 2. En tant que Joueur 1 (User 2) : voit ses propres widgets mais pas ceux de Joueur 2
    const p1Result = await queries.getTopicPosts(101, 1, 2);
    assert.ok(p1Result.posts[0].perso?.widgets);
    assert.equal(p1Result.posts[1].perso?.widgets, null);

    // 3. En tant qu'utilisateur externe (User 99) : ne voit aucun widget
    const anonResult = await queries.getTopicPosts(101, 1, 99);
    assert.equal(anonResult.posts[0].perso?.widgets, null);
    assert.equal(anonResult.posts[1].perso?.widgets, null);
  });
});
