import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReorderTopicsUseCase } from './reorder-topics.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
  SectionNotFoundError,
  TopicNotFoundError,
} from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('ReorderTopicsUseCase', () => {
  let useCase: ReorderTopicsUseCase;
  let mockCampaignRepo: ICampaignRepository;
  let mockForumRepo: IForumRepository;

  const mockCampaign: CampaignSummary = {
    id: 1,
    name: 'La Malédiction de Strahd',
    mjId: 10,
    mjUsername: 'GM_User',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    systeme: 'D&D 5e',
    univers: 'Ravenloft',
    description: '',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  let reorderedCampaignId: number | null = null;
  let reorderedSections: any[] = [];

  beforeEach(() => {
    reorderedCampaignId = null;
    reorderedSections = [];

    mockCampaignRepo = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => {
        if (id === 1) return { ...mockCampaign };
        return null;
      },
      createCampaign: async () => 1,
      updateCampaign: async () => {},
      findCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      updateCampaignBanner: async () => {},
      findCampaignParticipants: async () => [],
      isUserCampaignParticipant: async () => false,
      addCampaignParticipant: async () => {},
      findObservedCampaigns: async () => [],
      isUserCampaignObserver: async () => false,
      addCampaignObserver: async () => {},
      removeCampaignObserver: async () => {},
      findCampaignObservers: async () => [],
      isUserCampaignAlert: async () => false,
      addCampaignAlert: async () => {},
      removeCampaignAlert: async () => {},
    };

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === 1 || id === 2) {
          return {
            id,
            campagneId: 1,
            title: `Section ${id}`,
            ordre: id,
            defaultCollapse: false,
            banniere: '',
          };
        }
        if (id === 99) {
          return {
            id: 99,
            campagneId: 2, // Appartient à une autre campagne
            title: 'Autre Section',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
          };
        }
        return null;
      },
      createSection: async () => 1,
      updateSection: async () => {},
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async (campaignId, sections) => {
        reorderedCampaignId = campaignId;
        reorderedSections = sections;
      },
      findTopicById: async (topicId: number) => {
        if (topicId === 10 || topicId === 11) {
          return {
            id: topicId,
            sectionId: 1,
            sectionTitle: 'Section 1',
            campagneId: 1,
            campaignTitle: 'Strahd',
            title: `Topic ${topicId}`,
            stickable: 0,
            isPrivate: 0,
            isClosed: 0,
            ordre: 1,
          };
        }
        if (topicId === 20) {
          return {
            id: 20,
            sectionId: 2,
            sectionTitle: 'Section 2',
            campagneId: 1,
            campaignTitle: 'Strahd',
            title: 'Topic 20',
            stickable: 0,
            isPrivate: 0,
            isClosed: 0,
            ordre: 1,
          };
        }
        if (topicId === 999) {
          return {
            id: 999,
            sectionId: 99,
            sectionTitle: 'Autre Section',
            campagneId: 2, // Appartient à une autre campagne
            campaignTitle: 'Autre',
            title: 'Topic 999',
            stickable: 0,
            isPrivate: 0,
            isClosed: 0,
            ordre: 1,
          };
        }
        return null;
      },
      countPostsByTopicId: async () => 0,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
      countPostsAfterPostId: async () => 0,
      getPostById: async () => null,
      createPost: async () => 1,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 1 && userId === 10;
      },
      isUserCampaignParticipant: async () => false,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    useCase = new ReorderTopicsUseCase(mockCampaignRepo, mockForumRepo);
  });

  it('réordonne et déplace les topics entre sections avec succès', async () => {
    const result = await useCase.execute({
      campagneId: 1,
      userId: 10,
      sections: [
        {
          sectionId: 1,
          topicIds: [11, 20], // 20 a été déplacé dans la section 1
        },
        {
          sectionId: 2,
          topicIds: [10], // 10 a été déplacé dans la section 2
        },
      ],
    });

    assert.equal(result.success, true);
    assert.equal(reorderedCampaignId, 1);
    assert.equal(reorderedSections.length, 2);
    assert.deepEqual(reorderedSections[0], { sectionId: 1, topicIds: [11, 20] });
    assert.deepEqual(reorderedSections[1], { sectionId: 2, topicIds: [10] });
  });

  it('interdit la réorganisation si l utilisateur n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 99,
          sections: [{ sectionId: 1, topicIds: [10] }],
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('lève une SectionNotFoundError si une section n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 10,
          sections: [{ sectionId: 404, topicIds: [] }],
        });
      },
      (err: any) => {
        assert(err instanceof SectionNotFoundError);
        return true;
      }
    );
  });

  it('lève une TopicNotFoundError si un topic n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 10,
          sections: [{ sectionId: 1, topicIds: [404] }],
        });
      },
      (err: any) => {
        assert(err instanceof TopicNotFoundError);
        return true;
      }
    );
  });

  it('refuse si un topic provient d une autre campagne', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 10,
          sections: [{ sectionId: 1, topicIds: [999] }],
        });
      },
      (err: any) => {
        assert(err instanceof ValidationError);
        return true;
      }
    );
  });
});
