import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdatePnjCategoryUseCase } from './update-pnj-category.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import {
  CategoryNotFoundError,
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('UpdatePnjCategoryUseCase', () => {
  let mockCampaignRepo: ICampaignRepository;
  let useCase: UpdatePnjCategoryUseCase;
  let updatedData: any = null;

  beforeEach(() => {
    updatedData = null;
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
            name: 'Ancien Nom',
            defaultCollapse: 0,
          };
        }
        return null;
      },
      createPnjCategory: async () => 1,
      updatePnjCategory: async (id, data) => {
        updatedData = { id, ...data };
      },
      deletePnjCategory: async () => {},
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

    useCase = new UpdatePnjCategoryUseCase(mockCampaignRepo);
  });

  it('devrait modifier une catégorie de PNJ avec succès pour le MJ', async () => {
    const result = await useCase.execute({
      categoryId: 5,
      userId: 1,
      name: 'Nouveau Nom',
      defaultCollapse: true,
    });

    assert.deepEqual(result, {
      id: 5,
      campagneId: 10,
      name: 'Nouveau Nom',
      defaultCollapse: true,
    });
    assert.deepEqual(updatedData, {
      id: 5,
      name: 'Nouveau Nom',
      defaultCollapse: 1,
    });
  });

  it('devrait lever CategoryNotFoundError si la catégorie n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          categoryId: 999,
          userId: 1,
          name: 'Nouveau Nom',
        });
      },
      (err: any) => {
        assert(err instanceof CategoryNotFoundError);
        return true;
      }
    );
  });

  it('devrait rejeter un nom vide lors de la modification', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          categoryId: 5,
          userId: 1,
          name: '   ',
        });
      },
      (err: any) => {
        assert(err instanceof ValidationError);
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
          name: 'Test',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });
});
