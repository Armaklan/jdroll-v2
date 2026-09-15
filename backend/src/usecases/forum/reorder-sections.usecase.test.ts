import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReorderSectionsUseCase } from './reorder-sections.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
  SectionNotFoundError,
} from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('ReorderSectionsUseCase', () => {
  let useCase: ReorderSectionsUseCase;
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
  let reorderedSectionIds: number[] = [];

  beforeEach(() => {
    reorderedCampaignId = null;
    reorderedSectionIds = [];

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
    };

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === 10 || id === 11) {
          return {
            id,
            campagneId: 1,
            title: `Section ${id}`,
            ordre: 1,
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
      reorderSections: async (campaignId, sectionIds) => {
        reorderedCampaignId = campaignId;
        reorderedSectionIds = sectionIds;
      },
      createTopic: async () => 1,
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async () => {},
      findTopicById: async () => null,
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

    useCase = new ReorderSectionsUseCase(mockCampaignRepo, mockForumRepo);
  });

  it('réordonne les sections avec succès', async () => {
    const result = await useCase.execute({
      campagneId: 1,
      userId: 10,
      sectionIds: [11, 10],
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.sectionIds, [11, 10]);
    assert.equal(reorderedCampaignId, 1);
    assert.deepEqual(reorderedSectionIds, [11, 10]);
  });

  it('interdit la réorganisation si l utilisateur n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 99,
          sectionIds: [10, 11],
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
          sectionIds: [10, 404],
        });
      },
      (err: any) => {
        assert(err instanceof SectionNotFoundError);
        return true;
      }
    );
  });

  it('refuse si une section appartient à une autre campagne', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 10,
          sectionIds: [10, 99],
        });
      },
      (err: any) => {
        assert(err instanceof ValidationError);
        return true;
      }
    );
  });
});
