import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeletePnjCategoryUseCase } from './delete-pnj-category.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import {
  CategoryNotFoundError,
  CampaignNotFoundError,
  ForbiddenError,
} from '../../errors/domain.errors.js';

describe('DeletePnjCategoryUseCase', () => {
  let mockCampaignRepo: ICampaignRepository;
  let useCase: DeletePnjCategoryUseCase;
  let deletedCategoryIds: number[] = [];

  beforeEach(() => {
    deletedCategoryIds = [];
    mockCampaignRepo = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findObservedCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => {
        if (id === 10) {
          return {
            id: 10,
            name: 'Campagne Test',
            mjId: 1,
            mjUsername: 'GM',
            nbJoueurs: 4,
            nbJoueursActuel: 1,
            banniere: '',
            systeme: 'D&D',
            univers: 'Fantasy',
            description: '',
            statut: 1,
            isArchived: false,
            isRecrutementOpen: false,
          };
        }
        return null;
      },
      createCampaign: async () => 1,
      updateCampaign: async () => {},
      findCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findPnjCategoryById: async (id: number) => {
        if (id === 5) {
          return {
            id: 5,
            campagneId: 10,
            name: 'Alliés',
            defaultCollapse: 0,
          };
        }
        return null;
      },
      createPnjCategory: async () => 1,
      updatePnjCategory: async () => {},
      deletePnjCategory: async (id: number) => {
        deletedCategoryIds.push(id);
      },
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      deleteCharacter: async () => {},
      updateCampaignBanner: async () => {},
      findCampaignParticipants: async () => [],
      isUserCampaignParticipant: async () => false,
      addCampaignParticipant: async () => {},
      isUserCampaignObserver: async () => false,
      addCampaignObserver: async () => {},
      removeCampaignObserver: async () => {},
      findCampaignObservers: async () => [],
      isUserCampaignAlert: async () => false,
      addCampaignAlert: async () => {},
      removeCampaignAlert: async () => {},
    };

    useCase = new DeletePnjCategoryUseCase(mockCampaignRepo);
  });

  it('devrait supprimer une catégorie de PNJ avec succès pour le MJ', async () => {
    const result = await useCase.execute({
      categoryId: 5,
      userId: 1,
    });

    assert.deepEqual(result, {
      success: true,
      categoryId: 5,
    });
    assert.deepEqual(deletedCategoryIds, [5]);
  });

  it('devrait lever CategoryNotFoundError si la catégorie n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          categoryId: 999,
          userId: 1,
        });
      },
      (err: any) => {
        assert(err instanceof CategoryNotFoundError);
        return true;
      }
    );
  });

  it('devrait lever CampaignNotFoundError si la campagne n existe pas', async () => {
    mockCampaignRepo.findById = async () => null;

    await assert.rejects(
      async () => {
        await useCase.execute({
          categoryId: 5,
          userId: 1,
        });
      },
      (err: any) => {
        assert(err instanceof CampaignNotFoundError);
        return true;
      }
    );
  });

  it('devrait lever ForbiddenError si l utilisateur n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          categoryId: 5,
          userId: 2, // Not MJ
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );

    assert.equal(deletedCategoryIds.length, 0);
  });
});
