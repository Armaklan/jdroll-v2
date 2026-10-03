import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignPermissionService } from '../../services/campaign-permission.service.js';

// Service de permissions stub : par défaut, seul le propriétaire a les droits
const stubPermissions = (): CampaignPermissionService =>
  ({
    isOwner: (mjId: number, userId: number) => mjId === userId,
    isAssistantMj: async () => false,
    hasMjRights: async (_campaignId: number, mjId: number, userId: number) => mjId === userId,
  } as unknown as CampaignPermissionService);

// Stub assistant : l'utilisateur non-propriétaire dispose des droits MJ (feature flip activé)
const stubAssistantPermissions = (): CampaignPermissionService =>
  ({
    isOwner: () => false,
    isAssistantMj: async () => true,
    hasMjRights: async () => true,
  } as unknown as CampaignPermissionService);
import { CreatePnjCategoryUseCase } from './create-pnj-category.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('CreatePnjCategoryUseCase', () => {
  let mockCampaignRepo: ICampaignRepository;
  let useCase: CreatePnjCategoryUseCase;
  let createdCategories: any[] = [];

  beforeEach(() => {
    createdCategories = [];
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
      findPnjCategoryById: async () => null,
      createPnjCategory: async (cat) => {
        const id = createdCategories.length + 1;
        createdCategories.push({ id, ...cat });
        return id;
      },
      updatePnjCategory: async () => {},
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

    useCase = new CreatePnjCategoryUseCase(mockCampaignRepo, stubPermissions());
  });

  it('devrait créer une catégorie de PNJ avec succès pour le MJ', async () => {
    const result = await useCase.execute({
      campagneId: 10,
      userId: 1,
      name: 'Alliés de la garde',
      defaultCollapse: true,
    });

    assert.deepEqual(result, {
      id: 1,
      campagneId: 10,
      name: 'Alliés de la garde',
      defaultCollapse: true,
    });
    assert.deepEqual(createdCategories[0], {
      id: 1,
      campagneId: 10,
      name: 'Alliés de la garde',
      defaultCollapse: 1,
    });
  });

  it('devrait créer une catégorie de PNJ pour un MJ Assistant (non propriétaire)', async () => {
    const assistantUseCase = new CreatePnjCategoryUseCase(mockCampaignRepo, stubAssistantPermissions());

    const result = await assistantUseCase.execute({
      campagneId: 10,
      userId: 2, // MJ Assistant, le propriétaire est l'utilisateur 1
      name: 'Catégorie de l assistant',
      defaultCollapse: false,
    });

    assert.equal(result.name, 'Catégorie de l assistant');
  });

  it('devrait rejeter si le nom est vide', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 10,
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

  it('devrait rejeter si la campagne n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 999,
          userId: 1,
          name: 'Ennemis',
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
          campagneId: 10,
          userId: 2, // Pas le MJ
          name: 'Ennemis',
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });
});
