import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateSectionUseCase } from './create-section.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('CreateSectionUseCase', () => {
  let useCase: CreateSectionUseCase;
  let mockCampaignRepo: ICampaignRepository;
  let mockForumRepo: IForumRepository;
  let mockUserRepo: IUserRepository;

  const mockCampaign: CampaignSummary = {
    id: 1,
    name: 'La Malédiction de Strahd',
    mjId: 10,
    mjUsername: 'GM_User',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    systeme: 'D&D 5e',
    univers: 'Ravenloft',
    description: '',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  let createdSections: any[] = [];

  beforeEach(() => {
    createdSections = [];

    mockCampaignRepo = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => {
        if (id === 1) return { ...mockCampaign };
        return null;
      },
      createCampaign: async () => 1,
      updateCampaign: async () => {},
      findCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      updateCampaignBanner: async () => {},
      findCampaignParticipants: async () => [],
      isUserCampaignParticipant: async () => false,
      addCampaignParticipant: async () => {},
      findObservedCampaigns: async () => [],
      isUserCampaignObserver: async () => false,
      addCampaignObserver: async () => {},
      removeCampaignObserver: async () => {},
      findCampaignObservers: async () => [],
      isUserCampaignAlert: async () => false,
      addCampaignAlert: async () => {},
      removeCampaignAlert: async () => {},
    };

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async () => null,
      createSection: async (data) => {
        const id = createdSections.length + 1;
        createdSections.push({ id, ...data });
        return id;
      },
      updateSection: async () => {},
      getMaxSectionOrdre: async () => createdSections.length,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async () => {},
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
      createPost: async () => 1,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 1 && userId === 10;
      },
      isUserCampaignParticipant: async () => false,
      findPersoById: async () => null,
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    mockUserRepo = {
      findById: async (id: number) => ({
        id,
        username: `user${id}`,
        mail: `user${id}@test.com`,
        profil: id === 100 ? 2 : 0, // id 100 is admin
        avatar: '',
        description: '',
        titre: '',
      }),
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async (d) => ({ id: 999, ...d, avatar: '', description: '', profil: 0, titre: '' }),
    };

    useCase = new CreateSectionUseCase(mockCampaignRepo, mockForumRepo, mockUserRepo);
  });

  it('crée une section avec succès pour le MJ de la campagne', async () => {
    const result = await useCase.execute({
      campagneId: 1,
      userId: 10,
      title: 'Actes RP',
      defaultCollapse: false,
    });

    assert.equal(result.id, 1);
    assert.equal(result.title, 'Actes RP');
    assert.equal(result.ordre, 1);
    assert.equal(result.defaultCollapse, false);
  });

  it('calcule correctement l ordre incrémental', async () => {
    await useCase.execute({
      campagneId: 1,
      userId: 10,
      title: 'Section 1',
    });

    const result2 = await useCase.execute({
      campagneId: 1,
      userId: 10,
      title: 'Section 2',
    });

    assert.equal(result2.ordre, 2);
  });

  it('interdit la création de section à un utilisateur qui n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 99, // Pas le MJ
          title: 'Section Hack',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('lève une CampaignNotFoundError si la campagne n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 999,
          userId: 10,
          title: 'Section Test',
        });
      },
      (err: any) => {
        assert(err instanceof CampaignNotFoundError);
        return true;
      }
    );
  });

  it('refuse un titre vide ou composé uniquement d espaces', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
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
  it('permet à un administrateur de créer une section sur le forum général', async () => {
    const result = await useCase.execute({
      campagneId: null,
      userId: 100, // Admin
      userProfil: 2,
      title: 'Taverne Générale',
    });

    assert.equal(result.title, 'Taverne Générale');
    assert.equal(result.campagneId, null);
  });

  it('interdit à un joueur standard de créer une section sur le forum général', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: null,
          userId: 10, // Joueur standard
          userProfil: 0,
          title: 'Section Interdite',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        assert.match(err.message, /administrateur/);
        return true;
      }
    );
  });
});
