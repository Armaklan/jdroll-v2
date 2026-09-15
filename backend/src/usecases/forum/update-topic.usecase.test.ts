import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateTopicUseCase } from './update-topic.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { RawTopicDetail } from '../../types/index.js';
import {
  TopicNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('UpdateTopicUseCase', () => {
  let useCase: UpdateTopicUseCase;
  let mockForumRepo: IForumRepository;
  let mockTopic: RawTopicDetail;
  let updatedTopicData: any;

  beforeEach(() => {
    mockTopic = {
      id: 10,
      sectionId: 1,
      sectionTitle: 'Section test',
      campagneId: 10,
      campaignTitle: 'Campagne test',
      dialogueColor: null,
      penseeColor: null,
      rp1Color: null,
      rp2Color: null,
      quoteColor: null,
      sidebarColor: null,
      oddLineColor: null,
      evenLineColor: null,
      textColor: null,
      linkColor: null,
      linkSidebarColor: null,
      title: 'Sujet original',
      stickable: 0,
      isPrivate: 0,
      isClosed: 0,
      ordre: 1,
    };
    updatedTopicData = null;

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async () => null,
      createSection: async () => 1,
      updateSection: async () => {},
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async (topicId: number, data: any) => {
        updatedTopicData = { topicId, data };
        if (data.title !== undefined) mockTopic.title = data.title;
        if (data.stickable !== undefined) mockTopic.stickable = data.stickable ? 1 : 0;
        if (data.isPrivate !== undefined) mockTopic.isPrivate = data.isPrivate ? 1 : 0;
        if (data.isClosed !== undefined) mockTopic.isClosed = data.isClosed ? 1 : 0;
      },
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async () => {},
      findTopicById: async (topicId: number) => {
        if (topicId === mockTopic.id) return { ...mockTopic };
        return null;
      },
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

    useCase = new UpdateTopicUseCase(mockForumRepo);
  });

  it('met à jour avec succès un topic par le MJ', async () => {
    const result = await useCase.execute({
      topicId: 10,
      userId: 1,
      title: 'Titre de sujet modifié',
      stickable: true,
      isPrivate: 1,
      canReadUserIds: [2, 3],
      isClosed: true,
    });

    assert.equal(result.title, 'Titre de sujet modifié');
    assert.equal(result.stickable, true);
    assert.equal(result.isPrivate, 1);
    assert.equal(result.isClosed, true);
    assert.deepEqual(updatedTopicData, {
      topicId: 10,
      data: {
        title: 'Titre de sujet modifié',
        stickable: true,
        isPrivate: 1,
        canReadUserIds: [2, 3],
        isClosed: true,
      },
    });
  });

  it('lève une TopicNotFoundError si le sujet n\'existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 999,
          userId: 1,
          title: 'Nouveau titre',
        });
      },
      (err: any) => {
        assert(err instanceof TopicNotFoundError);
        return true;
      }
    );
  });

  it('lève une ForbiddenError si l\'utilisateur n\'est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 10,
          userId: 2, // non-MJ
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
          topicId: 10,
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
