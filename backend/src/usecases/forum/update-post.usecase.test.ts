import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdatePostUseCase } from './update-post.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  PostNotFoundError,
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import {
  ForumPost,
  RawTopicDetail,
  CharacterSummary,
} from '../../types/index.js';

describe('UpdatePostUseCase', () => {
  let useCase: UpdatePostUseCase;
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
      userId: 2, // Affecté au joueur 2
      campagneId: 100,
      name: 'Eldrin',
      concept: 'Elfe Rôdeur',
      avatar: 'eldrin.png',
    },
    {
      id: 51,
      userId: 3, // Affecté au joueur 3
      campagneId: 100,
      name: 'Grom',
      concept: 'Guerrier Nain',
      avatar: 'grom.png',
    },
    {
      id: 52,
      userId: null, // PNJ
      campagneId: 100,
      name: "L'Aubergiste",
      concept: 'PNJ Tavernier',
      avatar: 'aubergiste.png',
    },
  ];

  let postsStore: Map<number, {
    id: number;
    topicId: number;
    userId: number;
    persoId: number | null;
    content: string;
  }> = new Map();

  beforeEach(() => {
    postsStore = new Map();
    // Post 101 créé par joueur 2 dans topic 10
    postsStore.set(101, {
      id: 101,
      topicId: 10,
      userId: 2,
      persoId: 50,
      content: 'Message initial du joueur 2',
    });
    // Post 102 créé par MJ (user 1) dans topic 10
    postsStore.set(102, {
      id: 102,
      topicId: 10,
      userId: 1,
      persoId: null,
      content: 'Message initial du MJ',
    });
    // Post 103 dans topic fermé (topic 99)
    postsStore.set(103, {
      id: 103,
      topicId: 99,
      userId: 2,
      persoId: 50,
      content: 'Message dans topic fermé',
    });
    // Post 104 dans forum général (topic 20)
    postsStore.set(104, {
      id: 104,
      topicId: 20,
      userId: 2,
      persoId: null,
      content: 'Message forum général',
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
        if (topicId === 10) return { ...mockTopic };
        if (topicId === 99) return { ...mockTopic, id: 99, isClosed: 1 };
        if (topicId === 20) return { ...mockTopic, id: 20, campagneId: null };
        return null;
      },
      countPostsByTopicId: async () => postsStore.size,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
      countPostsAfterPostId: async () => 0,
      getPostById: async (postId: number): Promise<ForumPost | null> => {
        const found = postsStore.get(postId);
        if (!found) return null;
        const perso = mockPersos.find((p) => p.id === found.persoId);
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
          perso: perso
            ? {
                id: perso.id,
                name: perso.name,
                concept: perso.concept,
                avatar: perso.avatar,
                publicDescription: '',
              }
            : null,
          isRead: true,
        };
      },
      createPost: async () => 1,
      updatePost: async (postId, data) => {
        const found = postsStore.get(postId);
        if (found) {
          if (data.content !== undefined) found.content = data.content;
          if (data.persoId !== undefined) found.persoId = data.persoId;
        }
      },
      deletePost: async (postId) => {
        postsStore.delete(postId);
      },
      findLastPost: async () => null,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => mockPersos,
      findUserCampaignPersos: async (_, userId) => mockPersos.filter((p) => p.userId === userId),
      isUserCampaignMj: async (campagneId, userId) => campagneId === 100 && userId === 1,
      isUserCampaignParticipant: async (campagneId, userId) => campagneId === 100 && (userId === 2 || userId === 3),
      findPersoById: async (persoId) => mockPersos.find((p) => p.id === persoId) || null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => true,
    };

    useCase = new UpdatePostUseCase(mockForumRepo);
  });

  it('devrait permettre à un joueur de modifier son propre message', async () => {
    const updated = await useCase.execute({
      postId: 101,
      userId: 2,
      content: 'Contenu modifié par le joueur',
    });

    assert.equal(updated.content, 'Contenu modifié par le joueur');
    assert.equal(postsStore.get(101)?.content, 'Contenu modifié par le joueur');
  });

  it('devrait permettre au MJ de modifier le message d’un autre joueur dans sa partie', async () => {
    const updated = await useCase.execute({
      postId: 101,
      userId: 1, // MJ
      content: 'Contenu modéré par le MJ',
    });

    assert.equal(updated.content, 'Contenu modéré par le MJ');
    assert.equal(postsStore.get(101)?.content, 'Contenu modéré par le MJ');
  });

  it('devrait permettre au MJ de modifier le personnage associé à un message', async () => {
    const updated = await useCase.execute({
      postId: 101,
      userId: 1, // MJ
      content: 'Message avec PNJ',
      persoId: 52, // PNJ Tavernier
    });

    assert.equal(updated.perso?.id, 52);
    assert.equal(postsStore.get(101)?.persoId, 52);
  });

  it('devrait interdire à un joueur de modifier le message d’un autre joueur', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 101,
          userId: 3, // Joueur 3 tente de modifier le message du joueur 2
          content: 'Tentative de modification pirate',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /pas autorisé/);
        return true;
      }
    );
  });

  it('devrait interdire à un joueur de s’assigner le personnage d’un autre joueur lors de la modification', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 101,
          userId: 2,
          content: 'Message avec perso du joueur 3',
          persoId: 51, // Perso de joueur 3
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /ne vous est pas assigné/);
        return true;
      }
    );
  });

  it('devrait interdire à un joueur de modifier un message dans un sujet fermé', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 103,
          userId: 2,
          content: 'Tentative d’édition sur sujet fermé',
        });
      },
      (err: any) => {
        assert.ok(err instanceof TopicClosedError);
        return true;
      }
    );
  });

  it('devrait permettre au MJ de modifier un message même dans un sujet fermé', async () => {
    const updated = await useCase.execute({
      postId: 103,
      userId: 1, // MJ
      content: 'Mise à jour par le MJ sur sujet fermé',
    });

    assert.equal(updated.content, 'Mise à jour par le MJ sur sujet fermé');
  });

  it('devrait refuser une modification avec un contenu vide', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 101,
          userId: 2,
          content: '   ',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );
  });

  it('devrait renvoyer PostNotFoundError si le message n’existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          postId: 999,
          userId: 1,
          content: 'Message fantôme',
        });
      },
      (err: any) => {
        assert.ok(err instanceof PostNotFoundError);
        return true;
      }
    );
  });

  it('devrait permettre à l’auteur de modifier son message dans le forum général', async () => {
    const updated = await useCase.execute({
      postId: 104,
      userId: 2,
      content: 'Message forum général modifié',
    });

    assert.equal(updated.content, 'Message forum général modifié');
  });
});
