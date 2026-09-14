import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RollDiceUseCase } from './roll-dice.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IDicerRepository, DicerRoll } from '../../repositories/dicer.repository.js';
import {
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { RawTopicDetail, ForumPost } from '../../types/index.js';

describe('RollDiceUseCase', () => {
  let useCase: RollDiceUseCase;
  let mockForumRepo: IForumRepository;
  let mockDicerRepo: IDicerRepository;

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

  let createdPosts: any[] = [];
  let createdRolls: any[] = [];
  let updatedLastPosts: Map<number, number> = new Map();
  let readPosts: Map<string, number> = new Map();

  // RNG déterministe qui retourne 0.5 (d6 -> 4)
  const fixedRng = () => 0.5;

  beforeEach(() => {
    createdPosts = [];
    createdRolls = [];
    updatedLastPosts = new Map();
    readPosts = new Map();

    mockDicerRepo = {
      createRoll: async (data): Promise<number> => {
        const id = createdRolls.length + 1;
        createdRolls.push({ id, ...data });
        return id;
      },
      getRollById: async (id: number): Promise<DicerRoll | null> => {
        const r = createdRolls.find((item) => item.id === id);
        if (!r) return null;
        return {
          id: r.id,
          userId: r.userId,
          campagneId: r.campagneId,
          createDate: new Date().toISOString(),
          result: r.result,
          description: r.description,
        };
      },
      getRollWithUserById: async () => null,
      getRecentRollsByCampaign: async () => [],
    };

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
      countPostsByTopicId: async () => 5,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      countPostsAfterPostId: async () => 0,
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
            id: found.userId ?? 0,
            username: found.userId ? `User_${found.userId}` : 'Système',
            avatar: '',
            profil: 0,
            titre: '',
          },
          perso: null,
          isRead: true,
        };
      },
      createPost: async (data): Promise<number> => {
        const id = createdPosts.length + 1;
        createdPosts.push({ id, ...data });
        return id;
      },
      updateTopicLastPost: async (topicId: number, postId: number) => {
        updatedLastPosts.set(topicId, postId);
      },
      markTopicAsRead: async (topicId: number, userId: number, postId: number) => {
        readPosts.set(`${topicId}-${userId}`, postId);
      },
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 100 && userId === 1; // MJ = 1
      },
      isUserCampaignParticipant: async (campagneId: number, userId: number) => {
        return campagneId === 100 && (userId === 2 || userId === 3); // Joueurs = 2, 3
      },
      findPersoById: async () => null,
    };

    useCase = new RollDiceUseCase(mockForumRepo, mockDicerRepo, fixedRng);
  });

  it('exécute un jet de dé avec succès, insère dans dicer et crée un post sans user_id en auteur', async () => {
    const result = await useCase.execute({
      topicId: 10,
      userId: 2,
      formula: '3d6 + 3',
      description: 'Jet de force',
    });

    assert.ok(result);
    assert.strictEqual(result.rollId, 1);
    assert.strictEqual(createdRolls.length, 1);
    assert.strictEqual(createdRolls[0].userId, 2);
    assert.strictEqual(createdRolls[0].campagneId, 100);
    assert.strictEqual(createdRolls[0].description, 'Jet de force');

    assert.strictEqual(createdPosts.length, 1);
    assert.strictEqual(createdPosts[0].topicId, 10);
    assert.strictEqual(createdPosts[0].userId, null); // Pas d'user id en auteur !
    assert.strictEqual(createdPosts[0].persoId, null);
    assert.ok(createdPosts[0].content.includes('Jet de force'));
    assert.ok(createdPosts[0].content.includes('3d6 + 3'));

    assert.strictEqual(updatedLastPosts.get(10), 1);
    assert.strictEqual(readPosts.get('10-2'), 1);
  });

  it('permet à n’importe quel utilisateur authentifié de lancer des dés dans le forum général', async () => {
    const result = await useCase.execute({
      topicId: 20,
      userId: 42,
      formula: '1d20',
      description: 'Test forum général',
    });

    assert.ok(result);
    assert.strictEqual(createdRolls[0].campagneId, 0);
  });

  it('interdit à un non-participant de lancer des dés dans une campagne', async () => {
    await assert.rejects(
      useCase.execute({
        topicId: 10,
        userId: 999, // Inconnu
        formula: '1d20',
        description: 'Triche',
      }),
      ForbiddenError
    );
  });

  it('interdit le jet dans un sujet fermé', async () => {
    await assert.rejects(
      useCase.execute({
        topicId: 99,
        userId: 1,
        formula: '1d20',
        description: 'Sujet fermé',
      }),
      TopicClosedError
    );
  });

  it('lève une TopicNotFoundError si le topic n’existe pas', async () => {
    await assert.rejects(
      useCase.execute({
        topicId: 404,
        userId: 1,
        formula: '1d20',
      }),
      TopicNotFoundError
    );
  });

  it('lève une ValidationError si la formule est vide ou invalide', async () => {
    await assert.rejects(
      useCase.execute({
        topicId: 10,
        userId: 1,
        formula: '',
      }),
      ValidationError
    );

    await assert.rejects(
      useCase.execute({
        topicId: 10,
        userId: 1,
        formula: 'invalid_formula',
      }),
      ValidationError
    );
  });
});
