import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateSectionUseCase } from './update-section.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('UpdateSectionUseCase', () => {
  let useCase: UpdateSectionUseCase;
  let mockForumRepo: IForumRepository;
  let mockSection: {
    id: number;
    campagneId: number | null;
    title: string;
    ordre: number;
    defaultCollapse: boolean;
    banniere: string;
  };
  let updatedSectionData: any;

  beforeEach(() => {
    mockSection = {
      id: 1,
      campagneId: 10,
      title: 'Section originale',
      ordre: 1,
      defaultCollapse: false,
      banniere: 'https://example.com/banner.jpg',
    };
    updatedSectionData = null;

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === mockSection.id) return { ...mockSection };
        return null;
      },
      createSection: async () => 1,
      updateSection: async (sectionId: number, data: any) => {
        updatedSectionData = { sectionId, data };
        if (data.title !== undefined) mockSection.title = data.title;
        if (data.defaultCollapse !== undefined) mockSection.defaultCollapse = data.defaultCollapse;
        if (data.banniere !== undefined) mockSection.banniere = data.banniere;
      },
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async () => {},
      findTopicById: async () => null,
      countPostsByTopicId: async () => 0,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      countPostsAfterPostId: async () => 0,
      getPostById: async () => null,
      createPost: async () => 1,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 10 && userId === 1; // MJ is userId 1
      },
      isUserCampaignParticipant: async () => true,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    useCase = new UpdateSectionUseCase(mockForumRepo);
  });

  it('met à jour avec succès une section par le MJ', async () => {
    const result = await useCase.execute({
      sectionId: 1,
      userId: 1,
      title: 'Titre modifié',
      defaultCollapse: true,
      banniere: 'https://example.com/new-banner.png',
    });

    assert.equal(result.title, 'Titre modifié');
    assert.equal(result.defaultCollapse, true);
    assert.equal(result.banniere, 'https://example.com/new-banner.png');
    assert.deepEqual(updatedSectionData, {
      sectionId: 1,
      data: {
        title: 'Titre modifié',
        defaultCollapse: true,
        banniere: 'https://example.com/new-banner.png',
      },
    });
  });

  it('lève une SectionNotFoundError si la section n\'existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 999,
          userId: 1,
          title: 'Nouveau titre',
        });
      },
      (err: any) => {
        assert(err instanceof SectionNotFoundError);
        return true;
      }
    );
  });

  it('lève une ForbiddenError si l\'utilisateur n\'est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 2, // Non-MJ
          title: 'Nouveau titre',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('lève une ValidationError si le titre est vide', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 1,
          title: '   ',
        });
      },
      (err: any) => {
        assert(err instanceof ValidationError);
        return true;
      }
    );
  });
});
