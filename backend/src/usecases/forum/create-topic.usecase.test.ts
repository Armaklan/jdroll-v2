import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateTopicUseCase } from './create-topic.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('CreateTopicUseCase', () => {
  let useCase: CreateTopicUseCase;
  let mockForumRepo: IForumRepository;

  let createdTopics: any[] = [];
  let createdPosts: any[] = [];
  let lastPosts: Map<number, number> = new Map();

  beforeEach(() => {
    createdTopics = [];
    createdPosts = [];
    lastPosts = new Map();

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === 1) {
          return {
            id: 1,
            campagneId: 100,
            title: 'Section Campagne',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
          };
        }
        if (id === 2) {
          return {
            id: 2,
            campagneId: null,
            title: 'Section Générale',
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
      createTopic: async (data) => {
        const id = createdTopics.length + 1;
        createdTopics.push({ id, ...data });
        return id;
      },
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => createdTopics.length,
      reorderTopics: async () => {},
      findTopicById: async () => null,
      countPostsByTopicId: async () => 0,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
      countPostsAfterPostId: async () => 0,
      getPostById: async () => null,
      createPost: async (data) => {
        const id = createdPosts.length + 1;
        createdPosts.push({ id, ...data });
        return id;
      },
      updateTopicLastPost: async (topicId, postId) => {
        lastPosts.set(topicId, postId);
      },
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 100 && userId === 10;
      },
      isUserCampaignParticipant: async () => false,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    useCase = new CreateTopicUseCase(mockForumRepo);
  });

  it('crée un sujet avec succès par le MJ de la campagne', async () => {
    const result = await useCase.execute({
      sectionId: 1,
      userId: 10,
      title: 'Chapitre 1 : Le début',
      stickable: true,
      isClosed: false,
    });

    assert.equal(result.id, 1);
    assert.equal(result.title, 'Chapitre 1 : Le début');
    assert.equal(result.stickable, true);
    assert.equal(result.ordre, 1);
  });

  it('crée un premier message automatiquement si firstPostContent est renseigné', async () => {
    const result = await useCase.execute({
      sectionId: 1,
      userId: 10,
      title: 'Chapitre 1',
      firstPostContent: 'Bienvenue dans ce nouveau chapitre.',
    });

    assert.equal(result.id, 1);
    assert.equal(result.postId, 1);
    assert.equal(createdPosts.length, 1);
    assert.equal(createdPosts[0].content, 'Bienvenue dans ce nouveau chapitre.');
    assert.equal(lastPosts.get(1), 1);
  });

  it('interdit la création de topic dans une campagne si l utilisateur n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 99,
          title: 'Sujet non autorisé',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('lève une SectionNotFoundError si la section n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 999,
          userId: 10,
          title: 'Sujet Perdu',
        });
      },
      (err: any) => {
        assert(err instanceof SectionNotFoundError);
        return true;
      }
    );
  });

  it('crée un sujet privé avec joueurs autorisés', async () => {
    let passedCanReadIds: number[] | undefined;
    mockForumRepo.createTopic = async (data) => {
      passedCanReadIds = data.canReadUserIds;
      return 42;
    };

    const result = await useCase.execute({
      sectionId: 1,
      userId: 10,
      title: 'Secret du MJ',
      isPrivate: 1,
      canReadUserIds: [2, 3],
    });

    assert.equal(result.id, 42);
    assert.equal(result.isPrivate, 1);
    assert.deepEqual(passedCanReadIds, [2, 3]);
  });

  it('refuse un titre vide', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 10,
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
