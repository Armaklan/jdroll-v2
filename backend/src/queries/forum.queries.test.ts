import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForumQueries } from './forum.queries.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import { CampaignSummary, ForumSectionSummary } from '../types/index.js';
import { CampaignNotFoundError } from '../errors/domain.errors.js';

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
  constructor(private sections: ForumSectionSummary[] = mockSections) {}

  async findSectionsByCampaignId(campaignId: number, _userId?: number): Promise<ForumSectionSummary[]> {
    return this.sections.filter((s) => s.campagneId === campaignId);
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
});
