import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MarkAllForumTopicsAsReadUseCase } from './mark-all-topics-as-read.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';

describe('MarkAllForumTopicsAsReadUseCase', () => {
  let useCase: MarkAllForumTopicsAsReadUseCase;
  let mockRepo: IForumRepository;
  let markedTopics: { topicId: number; userId: number; postId: number }[];

  beforeEach(() => {
    markedTopics = [];

    mockRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async () => null,
      createSection: async () => 0,
      updateSection: async () => {},
      deleteSection: async () => {},
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 0,
      updateTopic: async () => {},
      deleteTopic: async () => {},
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
      createPost: async () => 0,
      updatePost: async () => {},
      deletePost: async () => {},
      findLastPost: async () => null,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async (topicId: number, userId: number, postId: number) => {
        markedTopics.push({ topicId, userId, postId });
      },
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async () => false,
      isUserCampaignParticipant: async () => false,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
      findDraft: async () => null,
      saveDraft: async () => ({} as any),
      deleteDraft: async () => {},
      searchCampaignTopics: async () => [],
    };

    useCase = new MarkAllForumTopicsAsReadUseCase(mockRepo);
  });

  it('should mark all topics as read for general forum', async () => {
    const mockTopics = [
      { id: 1, lastPostId: 10 },
      { id: 2, lastPostId: 20 },
      { id: 3, lastPostId: 30 },
    ];

    mockRepo.findSectionsByCampaignId = async (campaignId: number | null) => {
      if (campaignId === null) {
        return [
          {
            id: 1,
            campagneId: null,
            title: 'Section Général',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
            topics: mockTopics,
          },
        ];
      }
      return [];
    };

    mockRepo.findLastPost = async (topicId: number) => {
      const topic = mockTopics.find((t) => t.id === topicId);
      return topic ? { id: topic.lastPostId } : null;
    };

    await useCase.execute({ userId: 1, campaignId: null });

    assert.equal(markedTopics.length, 3);
    assert.deepEqual(markedTopics, [
      { topicId: 1, userId: 1, postId: 10 },
      { topicId: 2, userId: 1, postId: 20 },
      { topicId: 3, userId: 1, postId: 30 },
    ]);
  });

  it('should mark all topics as read for a campaign forum', async () => {
    const mockTopics = [
      { id: 100, lastPostId: 1000 },
      { id: 101, lastPostId: 1010 },
    ];

    mockRepo.findSectionsByCampaignId = async (campaignId: number | null) => {
      if (campaignId === 42) {
        return [
          {
            id: 1,
            campagneId: 42,
            title: 'Section Campagne',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
            topics: mockTopics,
          },
        ];
      }
      return [];
    };

    mockRepo.findLastPost = async (topicId: number) => {
      const topic = mockTopics.find((t) => t.id === topicId);
      return topic ? { id: topic.lastPostId } : null;
    };

    await useCase.execute({ userId: 5, campaignId: 42 });

    assert.equal(markedTopics.length, 2);
    assert.deepEqual(markedTopics, [
      { topicId: 100, userId: 5, postId: 1000 },
      { topicId: 101, userId: 5, postId: 1010 },
    ]);
  });

  it('should skip topics without last post', async () => {
    const mockTopics = [
      { id: 1, lastPostId: 10 },
      { id: 2, lastPostId: null },
      { id: 3, lastPostId: 30 },
    ];

    mockRepo.findSectionsByCampaignId = async (campaignId: number | null) => {
      if (campaignId === null) {
        return [
          {
            id: 1,
            campagneId: null,
            title: 'Section Général',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
            topics: mockTopics,
          },
        ];
      }
      return [];
    };

    mockRepo.findLastPost = async (topicId: number) => {
      const topic = mockTopics.find((t) => t.id === topicId);
      return topic?.lastPostId ? { id: topic.lastPostId } : null;
    };

    await useCase.execute({ userId: 1, campaignId: null });

    assert.equal(markedTopics.length, 2);
    assert.deepEqual(markedTopics, [
      { topicId: 1, userId: 1, postId: 10 },
      { topicId: 3, userId: 1, postId: 30 },
    ]);
  });

  it('should handle multiple sections', async () => {
    const mockTopicsSection1 = [
      { id: 1, lastPostId: 10 },
      { id: 2, lastPostId: 20 },
    ];
    const mockTopicsSection2 = [
      { id: 3, lastPostId: 30 },
    ];

    mockRepo.findSectionsByCampaignId = async (campaignId: number | null) => {
      if (campaignId === null) {
        return [
          {
            id: 1,
            campagneId: null,
            title: 'Section 1',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
            topics: mockTopicsSection1,
          },
          {
            id: 2,
            campagneId: null,
            title: 'Section 2',
            ordre: 2,
            defaultCollapse: false,
            banniere: '',
            topics: mockTopicsSection2,
          },
        ];
      }
      return [];
    };

    mockRepo.findLastPost = async (topicId: number) => {
      const allTopics = [...mockTopicsSection1, ...mockTopicsSection2];
      const topic = allTopics.find((t) => t.id === topicId);
      return topic?.lastPostId ? { id: topic.lastPostId } : null;
    };

    await useCase.execute({ userId: 1, campaignId: null });

    assert.equal(markedTopics.length, 3);
    assert.deepEqual(markedTopics, [
      { topicId: 1, userId: 1, postId: 10 },
      { topicId: 2, userId: 1, postId: 20 },
      { topicId: 3, userId: 1, postId: 30 },
    ]);
  });
});
