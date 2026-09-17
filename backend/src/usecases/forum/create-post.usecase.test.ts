import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreatePostUseCase } from './create-post.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import {
  ForumPost,
  RawTopicDetail,
  CharacterSummary,
  ForumSectionSummary,
} from '../../types/index.js';

describe('CreatePostUseCase', () => {
  let useCase: CreatePostUseCase;
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

  let createdPosts: any[] = [];
  let updatedLastPosts: Map<number, number> = new Map();
  let readPosts: Map<string, number> = new Map();
  let deletedDrafts: Array<{ topicId: number; userId: number }> = [];

  beforeEach(() => {
    createdPosts = [];
    updatedLastPosts = new Map();
    readPosts = new Map();
    deletedDrafts = [];

    mockForumRepo = {
      findDraft: async () => null,
      saveDraft: async (data) => ({ id: 1, ...data, persoId: data.persoId ?? null }),
      deleteDraft: async (topicId, userId) => {
        deletedDrafts.push({ topicId, userId });
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
      countPostsByTopicId: async (): Promise<number> => 5,
      findPostsByTopicId: async (): Promise<ForumPost[]> => [],
      getUserLastReadPostId: async (): Promise<number | null> => null,
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
      countPostsAfterPostId: async (): Promise<number> => 0,
      getPostById: async (postId: number): Promise<ForumPost | null> => {
        const found = createdPosts.find((p) => p.id === postId);
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
          perso: found.persoId
            ? {
                id: found.persoId,
                name: mockPersos.find((p) => p.id === found.persoId)?.name || 'Perso',
                concept: mockPersos.find((p) => p.id === found.persoId)?.concept,
                avatar: mockPersos.find((p) => p.id === found.persoId)?.avatar,
              }
            : null,
          isRead: true,
        };
      },
      createPost: async (data): Promise<number> => {
        const newId = createdPosts.length + 100;
        createdPosts.push({ id: newId, ...data });
        return newId;
      },
      updateTopicLastPost: async (topicId, postId): Promise<void> => {
        updatedLastPosts.set(topicId, postId);
      },
      markTopicAsRead: async (topicId, userId, postId): Promise<void> => {
        readPosts.set(`${topicId}_${userId}`, postId);
      },
      findCampaignPersos: async (campagneId): Promise<CharacterSummary[]> => {
        return mockPersos.filter((p) => p.campagneId === campagneId);
      },
      findUserCampaignPersos: async (campagneId, userId): Promise<CharacterSummary[]> => {
        return mockPersos.filter((p) => p.campagneId === campagneId && p.userId === userId);
      },
      isUserCampaignMj: async (_campagneId, userId): Promise<boolean> => {
        return userId === 1; // User 1 est le MJ
      },
      isUserCampaignParticipant: async (_campagneId, userId): Promise<boolean> => {
        return userId === 2 || userId === 3; // Users 2 et 3 sont joueurs
      },
      findPersoById: async (persoId): Promise<CharacterSummary | null> => {
        return mockPersos.find((p) => p.id === persoId) || null;
      },
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async (topicId: number, userId: number) => {
        return topicId === 15 && userId === 2; // User 2 is allowed on private topic 15
      },
    };

    useCase = new CreatePostUseCase(mockForumRepo);
  });

  it('crée avec succès un message posté par un joueur avec son personnage', async () => {
    const post = await useCase.execute({
      topicId: 10,
      userId: 2,
      content: '<p>Je tire une flèche vers les ténèbres !</p>',
      persoId: 50, // Eldrin (affecté à l'utilisateur 2)
    });

    assert.equal(post.content, '<p>Je tire une flèche vers les ténèbres !</p>');
    assert.equal(post.user.id, 2);
    assert.equal(post.perso?.id, 50);
    assert.equal(post.perso?.name, 'Eldrin');
    assert.equal(updatedLastPosts.get(10), post.id);
    assert.equal(readPosts.get('10_2'), post.id);
    assert.deepEqual(deletedDrafts, [{ topicId: 10, userId: 2 }]);
  });

  it("permet au MJ de poster avec n'importe quel personnage (PNJ ou PJ de la campagne)", async () => {
    const post = await useCase.execute({
      topicId: 10,
      userId: 1, // MJ
      content: "<p>L'aubergiste vous sert une chope bien fraîche.</p>",
      persoId: 52, // PNJ Aubergiste
    });

    assert.equal(post.perso?.id, 52);
    assert.equal(post.perso?.name, "L'Aubergiste");
    assert.equal(post.user.id, 1);
  });

  it('permet au MJ de poster en tant que joueur PJ', async () => {
    const post = await useCase.execute({
      topicId: 10,
      userId: 1, // MJ
      content: '<p>Intervention MJ pour Grom</p>',
      persoId: 51, // Grom (PJ du joueur 3)
    });

    assert.equal(post.perso?.id, 51);
  });

  it("interdit à un joueur de poster avec le personnage d'un autre joueur", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 10,
          userId: 2, // Joueur 2
          content: "<p>Tentative d'usurpation</p>",
          persoId: 51, // Grom (affecté au joueur 3)
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Ce personnage ne vous est pas assigné/);
        return true;
      }
    );
  });

  it("interdit à un utilisateur non participant et non MJ de poster dans une campagne", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 10,
          userId: 999, // Inconnu
          content: '<p>Message intrusif</p>',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Seuls les joueurs et le MJ peuvent poster dans ce sujet public/);
        return true;
      }
    );
  });

  it('permet à un utilisateur autorisé de poster dans un sujet privé', async () => {
    const post = await useCase.execute({
      topicId: 15, // isPrivate: 1, user 2 is allowed
      userId: 2,
      content: '<p>Message secret</p>',
    });
    assert.equal(post.user.id, 2);
  });

  it('interdit à un utilisateur non autorisé de poster dans un sujet privé', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 15, // isPrivate: 1, user 3 is not allowed
          userId: 3,
          content: '<p>Tentative d intrusion</p>',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Vous n'êtes pas autorisé à poster dans ce sujet privé/);
        return true;
      }
    );
  });

  it('permet à n importe quel utilisateur authentifié de poster dans un topic grand public de campagne', async () => {
    const post = await useCase.execute({
      topicId: 18, // isPrivate: 2 (Grand public)
      userId: 999, // non participant
      content: '<p>Message de spectateur</p>',
    });
    assert.equal(post.user.id, 999);
  });

  it("permet à n'importe quel utilisateur de poster dans le forum général grand public", async () => {
    const post = await useCase.execute({
      topicId: 20, // Grand public (campagneId: null)
      userId: 999,
      content: '<p>Bonjour à toute la communauté !</p>',
    });

    assert.equal(post.user.id, 999);
    assert.equal(post.perso, null);
  });

  it("refuse un message vide ou composé uniquement d'espaces", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 10,
          userId: 2,
          content: '<p>   </p>',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );
  });

  it('refuse de poster dans un sujet fermé', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 99, // Sujet fermé
          userId: 1,
          content: '<p>Un dernier mot...</p>',
        });
      },
      (err: any) => {
        assert.ok(err instanceof TopicClosedError);
        return true;
      }
    );
  });

  it("lève une TopicNotFoundError si le topic n'existe pas", async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          topicId: 9999,
          userId: 1,
          content: '<p>Test</p>',
        });
      },
      (err: any) => {
        assert.ok(err instanceof TopicNotFoundError);
        return true;
      }
    );
  });
});
