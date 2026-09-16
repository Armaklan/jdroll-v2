import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteSectionUseCase } from './delete-section.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  CampaignNotFoundError,
} from '../../errors/domain.errors.js';

describe('DeleteSectionUseCase', () => {
  let useCase: DeleteSectionUseCase;
  let mockCampaignRepo: ICampaignRepository;
  let mockForumRepo: IForumRepository;
  let mockUserRepo: IUserRepository;
  let deletedSectionId: number | null;

  beforeEach(() => {
    deletedSectionId = null;

    mockCampaignRepo = {
      findById: async (id: number) => {
        if (id === 10) {
          return {
            id: 10,
            mjId: 1,
            name: 'Campagne Test',
            description: '',
            avatar: '',
            systeme: '',
            univers: '',
            regles: '',
            nbJoueurs: 4,
            nbJoueursActuel: 1,
            statut: 1,
            banniere: '',
            bannierePrivee: '',
            bannierePerso: '',
            isPublic: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
        return null;
      },
      findAll: async () => [],
      findActiveCampaigns: async () => [],
      findArchivedCampaigns: async () => [],
      findByParticipantUserId: async () => [],
      findByMjUserId: async () => [],
      findFavoritesByUserId: async () => [],
      create: async () => 1,
      update: async () => {},
      isUserParticipant: async () => true,
      isUserMj: async (campId: number, userId: number) => campId === 10 && userId === 1,
      countCampaigns: async () => 0,
      getConfig: async () => null,
      upsertConfig: async () => {},
      addFavorite: async () => {},
      removeFavorite: async () => {},
      isFavorite: async () => false,
      findWaitingParticipants: async () => [],
      findActiveParticipants: async () => [],
      addParticipant: async () => {},
      updateParticipantStatus: async () => {},
      removeParticipant: async () => {},
      updateBanner: async () => {},
    };

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === 1) {
          return {
            id: 1,
            campagneId: 10,
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
      deleteSection: async (id: number) => {
        deletedSectionId = id;
      },
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
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
      createPost: async () => 1,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => campagneId === 10 && userId === 1,
      isUserCampaignParticipant: async () => true,
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
        profil: id === 100 ? 2 : 0,
        avatar: '',
        description: '',
        titre: '',
      }),
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async (d) => ({ id: 999, ...d, avatar: '', description: '', profil: 0, titre: '' }),
      update: async () => {},
      updatePassword: async () => {},
      updateAvatar: async () => {},
    };

    useCase = new DeleteSectionUseCase(mockCampaignRepo, mockForumRepo, mockUserRepo);
  });

  it('devrait supprimer une section de campagne si l’utilisateur est le MJ', async () => {
    const result = await useCase.execute({
      sectionId: 1,
      userId: 1,
    });

    assert.equal(result.success, true);
    assert.equal(result.sectionId, 1);
    assert.equal(deletedSectionId, 1);
  });

  it('devrait refuser la suppression si non MJ dans une campagne', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 2,
        });
      },
      (error: Error) => {
        assert.ok(error instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('devrait supprimer une section générale si l’utilisateur est admin (profil = 2)', async () => {
    const result = await useCase.execute({
      sectionId: 2,
      userId: 100,
      userProfil: 2,
    });

    assert.equal(result.success, true);
    assert.equal(result.sectionId, 2);
    assert.equal(deletedSectionId, 2);
  });

  it('devrait refuser la suppression de section générale pour un non-admin', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 2,
          userId: 1,
          userProfil: 0,
        });
      },
      (error: Error) => {
        assert.ok(error instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('devrait lever SectionNotFoundError si la section n’existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 999,
          userId: 1,
        });
      },
      (error: Error) => {
        assert.ok(error instanceof SectionNotFoundError);
        return true;
      }
    );
  });
});
