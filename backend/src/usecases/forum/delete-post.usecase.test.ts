import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeletePostUseCase } from './delete-post.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  PostNotFoundError,
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
} from '../../errors/domain.errors.js';
import {
  ForumPost,
  RawTopicDetail,
  CharacterSummary,
} from '../../types/index.js';

describe('DeletePostUseCase', () => {
  let useCase: DeletePostUseCase;
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
    lastPostId: 102,
  };

  let postsStore: Map<number, {
    id: number;
    topicId: number;
    userId: number;
    persoId: number | null;
    content: string;
  }> = new Map();

  let topicLastPostMap: Map<number, number | null> = new Map();

  beforeEach(() => {
    postsStore = new Map();
    topicLastPostMap = new Map();
    topicLastPostMap.set(10, 102);
    topicLastPostMap.set(20, 202);
    topicLastPostMap.set(99, 992);

    // Topic 10 : Post 101 (joueur 2), Post 102 (joueur 2, dernier post)
    postsStore.set(101, {
      id: 101,
      topicId: 10,
      userId: 2,
      persoId: null,
      content: 'Premier message du joueur 2',
    });
    postsStore.set(102, {
      id: 102,
      topicId: 10,
      userId: 2,
      persoId: null,
      content: 'Second message du joueur 2 (dernier)',
    });

    // Topic 20 (forum général) : Post 201 (joueur 2), Post 202 (joueur 3, dernier post)
    postsStore.set(201, {
      id: 201,
      topicId: 20,
      userId: 2,
      persoId: null,
      content: 'Message 1 forum général',
    });
    postsStore.set(202, {
      id: 202,
      topicId: 20,
      userId: 3,
      persoId: null,
      content: 'Message 2 forum général',
    });

    // Topic 99 (fermé) : Post 992 (joueur 2)
    postsStore.set(992, {
      id: 992,
      topicId: 99,
      userId: 2,
      persoId: null,
      content: 'Message topic fermé',
    });

    mockForumRepo = {
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
        if (topicId === 10) return { ...mockTopic, lastPostId: topicLastPostMap.get(10) ?? null };
        if (topicId === 99) return { ...mockTopic, id: 99, isClosed: 1, lastPostId: topicLastPostMap.get(99) ?? null };
        if (topicId === 20) return { ...mockTopic, id: 20, campagneId: null, lastPostId: topicLastPostMap.get(20) ?? null };
        return null;
      },
      countPostsByTopicId: async () => postsStore.size,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
      countPostsAfterPostId: async (topicId: number, postId: number): Promise<number> => {
        const topicPosts = Array.from(postsStore.values()).filter((p) => p.topicId === topicId);
        return topicPosts.filter((p) => p.id > postId).length;
      },
      getPostById: async (postId: number): Promise<ForumPost | null> => {
        const found = postsStore.get(postId);
        if (!found) return null;
        return {
          id: found.id,
          topicId: found.topicId,
          content: found.content,
          createDate: new Date().toISOString(),
          editor: 0,
          user: {
            id: found.userId,
            username: found.userId === 1 ? 'MJ_User' : `Player_${found.userId}`,
            avatar: '',
            profil: found.userId === 1 ? 1 : 0,
            titre: '',
          },
          perso: null,
          isRead: true,
        };
      },
      createPost: async () => 1,
      updatePost: async () => {},
      deletePost: async (postId) => {
        postsStore.delete(postId);
      },
      findLastPost: async (topicId, excludePostId) => {
        const topicPosts = Array.from(postsStore.values())
          .filter((p) => p.topicId === topicId && (excludePostId ? p.id !== excludePostId : true))
          .sort((a, b) => b.id - a.id);
        return topicPosts.length > 0 ? { id: topicPosts[0].id } : null;
      },
      updateTopicLastPost: async (topicId, postId) => {
        topicLastPostMap.set(topicId, postId);
      },
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId, userId) => campagneId === 100 && userId === 1,
      isUserCampaignParticipant: async (campagneId, userId) => campagneId === 100 && (userId === 2 || userId === 3),
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => true,
    };

    useCase = new DeletePostUseCase(mockForumRepo);
  });

  it('devrait permettre à un joueur de supprimer son message s’il s’agit du dernier message du fil', async () => {
    const result = await useCase.execute({
      postId: 102,
      userId: 2,
    });

    assert.equal(result.success, true);
    assert.equal(result.deletedPostId, 102);
    assert.equal(result.newLastPostId, 101);
    assert.equal(postsStore.has(102), false);
    assert.equal(topicLastPostMap.get(10), 101);
  });

  it('devrait refuser la suppression par un joueur si son message n’est pas le dernier du fil', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 101, // Il y a le post 102 après lui
          userId: 2,
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /dernier message du sujet/);
        return true;
      }
    );
    assert.equal(postsStore.has(101), true);
  });

  it('devrait permettre au MJ de supprimer n’importe quel message de sa partie même s’il n’est pas le dernier', async () => {
    const result = await useCase.execute({
      postId: 101, // Message intermédiaire
      userId: 1, // MJ
    });

    assert.equal(result.success, true);
    assert.equal(postsStore.has(101), false);
    // Le lastPostId du topic reste 102 car 101 n'était pas le dernier
    assert.equal(topicLastPostMap.get(10), 102);
  });

  it('devrait permettre au MJ de supprimer le dernier message et mettre à jour le topic', async () => {
    const result = await useCase.execute({
      postId: 102, // Dernier message
      userId: 1, // MJ
    });

    assert.equal(result.success, true);
    assert.equal(result.newLastPostId, 101);
    assert.equal(postsStore.has(102), false);
    assert.equal(topicLastPostMap.get(10), 101);
  });

  it('devrait mettre à jour last_post_id à null si le MJ supprime l’unique message restant du topic', async () => {
    postsStore.delete(102);
    topicLastPostMap.set(10, 101);

    const result = await useCase.execute({
      postId: 101,
      userId: 1, // MJ
    });

    assert.equal(result.success, true);
    assert.equal(result.newLastPostId, null);
    assert.equal(topicLastPostMap.get(10), null);
  });

  it('devrait interdire à un joueur de supprimer le message d’un autre utilisateur', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 202, // Créé par joueur 3
          userId: 2, // Joueur 2 tente de supprimer
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /pas autorisé/);
        return true;
      }
    );
  });

  it('devrait interdire à un joueur de supprimer un message dans un sujet fermé', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 992,
          userId: 2,
        });
      },
      (err: any) => {
        assert.ok(err instanceof TopicClosedError);
        return true;
      }
    );
  });

  it('devrait permettre au MJ de supprimer un message dans un sujet fermé', async () => {
    const result = await useCase.execute({
      postId: 992,
      userId: 1, // MJ
    });

    assert.equal(result.success, true);
    assert.equal(postsStore.has(992), false);
  });

  it('devrait renvoyer PostNotFoundError si le message n’existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 999,
          userId: 1,
        });
      },
      (err: any) => {
        assert.ok(err instanceof PostNotFoundError);
        return true;
      }
    );
  });
});
