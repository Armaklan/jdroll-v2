import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaveDraftUseCase } from './save-draft.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import {
  ForumSectionSummary,
  RawTopicDetail,
  CharacterSummary,
  TopicDraft,
} from '../../types/index.js';

describe('SaveDraftUseCase', () => {
  let useCase: SaveDraftUseCase;
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

  const mockPersos: CharacterSummary[] = [
    {
      id: 50,
      userId: 2,
      campagneId: 100,
      name: 'Eldrin',
      concept: 'Elfe Rôdeur',
      avatar: 'eldrin.png',
    },
    {
      id: 51,
      userId: 3,
      campagneId: 100,
      name: 'Grom',
      concept: 'Guerrier Nain',
      avatar: 'grom.png',
    },
  ];

  let savedDrafts: TopicDraft[] = [];
  let deletedDrafts: Array<{ topicId: number; userId: number }> = [];

  beforeEach(() => {
    savedDrafts = [];
    deletedDrafts = [];

    mockForumRepo = {
      findDraft: async (topicId, userId) => {
        return savedDrafts.find((d) => d.topicId === topicId && d.userId === userId) || null;
      },
      saveDraft: async (data) => {
        const existingIdx = savedDrafts.findIndex(
          (d) => d.topicId === data.topicId && d.userId === data.userId
        );
        const draft: TopicDraft = {
          id: existingIdx >= 0 ? savedDrafts[existingIdx].id : savedDrafts.length + 1,
          topicId: data.topicId,
          userId: data.userId,
          persoId: data.persoId ?? null,
          content: data.content,
        };
        if (existingIdx >= 0) {
          savedDrafts[existingIdx] = draft;
        } else {
          savedDrafts.push(draft);
        }
        return draft;
      },
      deleteDraft: async (topicId, userId) => {
        deletedDrafts.push({ topicId, userId });
        savedDrafts = savedDrafts.filter(
          (d) => !(d.topicId === topicId && d.userId === userId)
        );
      },
      findSectionsByCampaignId: async (): Promise<ForumSectionSummary[]> => [],
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
        if (topicId === 15) return { ...mockTopic, id: 15, isPrivate: 1 };
        if (topicId === 18) return { ...mockTopic, id: 18, isPrivate: 2 };
        if (topicId === 99) return { ...mockTopic, id: 99, isClosed: 1 };
        if (topicId === 20) return { ...mockTopic, id: 20, campagneId: null };
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
      findCampaignPersos: async (campagneId) => mockPersos.filter((p) => p.campagneId === campagneId),
      findUserCampaignPersos: async (campagneId, userId) =>
        mockPersos.filter((p) => p.campagneId === campagneId && p.userId === userId),
      isUserCampaignMj: async (_campagneId, userId) => userId === 1,
      isUserCampaignParticipant: async (_campagneId, userId) => userId === 2 || userId === 3,
      findPersoById: async (persoId) => mockPersos.find((p) => p.id === persoId) || null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async (topicId: number, userId: number) => topicId === 15 && userId === 2,
    };

    useCase = new SaveDraftUseCase(mockForumRepo);
  });

  it('sauvegarde avec succès un brouillon pour un joueur dans une campagne', async () => {
    const draft = await useCase.execute({
      topicId: 10,
      userId: 2,
      content: '<p>Mon début de message...</p>',
      persoId: 50,
    });

    assert.ok(draft);
    assert.equal(draft?.content, '<p>Mon début de message...</p>');
    assert.equal(draft?.persoId, 50);
    assert.equal(draft?.userId, 2);
    assert.equal(draft?.topicId, 10);
  });

  it('supprime le brouillon si le contenu est vide', async () => {
    const draft = await useCase.execute({
      topicId: 10,
      userId: 2,
      content: '   <p></p>  ',
    });

    assert.equal(draft, null);
    assert.deepEqual(deletedDrafts, [{ topicId: 10, userId: 2 }]);
  });

  it('lève TopicNotFoundError si le topic n existe pas', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          topicId: 9999,
          userId: 2,
          content: 'test',
        }),
      TopicNotFoundError
    );
  });

  it('lève TopicClosedError si le topic est fermé', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          topicId: 99,
          userId: 2,
          content: 'test',
        }),
      TopicClosedError
    );
  });

  it('lève ForbiddenError si l utilisateur n a pas les droits pour poster dans ce sujet', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          topicId: 10,
          userId: 999,
          content: 'test',
        }),
      ForbiddenError
    );
  });

  it('lève ForbiddenError si le personnage n est pas assigné à l utilisateur', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          topicId: 10,
          userId: 2,
          content: 'test',
          persoId: 51, // Affecté au joueur 3
        }),
      ForbiddenError
    );
  });
});
