import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteDraftUseCase } from './delete-draft.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { TopicNotFoundError } from '../../errors/domain.errors.js';
import { RawTopicDetail } from '../../types/index.js';

describe('DeleteDraftUseCase', () => {
  let useCase: DeleteDraftUseCase;
  let mockForumRepo: IForumRepository;

  const mockTopic: RawTopicDetail = {
    id: 10,
    sectionId: 1,
    sectionTitle: 'RP Acte 1',
    campagneId: 100,
    campaignTitle: 'Campagne Epique',
    title: 'Discussion en taverne',
    stickable: 0,
    isPrivate: 0,
    isClosed: 0,
    ordre: 1,
  };

  let deletedDrafts: Array<{ topicId: number; userId: number }> = [];

  beforeEach(() => {
    deletedDrafts = [];

    mockForumRepo = {
      findDraft: async () => null,
      saveDraft: async (data) => ({ id: 1, ...data, persoId: data.persoId ?? null }),
      deleteDraft: async (topicId, userId) => {
        deletedDrafts.push({ topicId, userId });
      },
      findSectionsByCampaignId: async () => [],
      findSectionById: async () => null,
      createSection: async () => 1,
      updateSection: async () => {},
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async () => {},
      findTopicById: async (topicId: number): Promise<RawTopicDetail | null> => {
        if (topicId === 10) return { ...mockTopic };
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
      updatePost: async () => {},
      deletePost: async () => {},
      findLastPost: async () => null,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async () => false,
      isUserCampaignParticipant: async () => false,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    useCase = new DeleteDraftUseCase(mockForumRepo);
  });

  it('supprime avec succès un brouillon existant', async () => {
    await useCase.execute({
      topicId: 10,
      userId: 2,
    });

    assert.deepEqual(deletedDrafts, [{ topicId: 10, userId: 2 }]);
  });

  it('lève TopicNotFoundError si le topic n existe pas', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          topicId: 9999,
          userId: 2,
        }),
      TopicNotFoundError
    );
  });
});
