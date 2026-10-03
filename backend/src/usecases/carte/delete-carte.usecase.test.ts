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
import { DeleteCarteUseCase } from './delete-carte.usecase.js';
import { ICarteRepository, CarteRecord } from '../../repositories/carte.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('DeleteCarteUseCase', () => {
  let useCase: DeleteCarteUseCase;
  let mockCarteRepo: Partial<ICarteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let deletedId: number | null = null;

  const mockCampaign: CampaignSummary = {
    id: 42,
    name: 'Campagne de test',
    mjId: 1,
    mjUsername: 'Maître',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    banniereForum: null,
    systeme: 'D&D 5e',
    univers: 'Fantasy',
    description: 'Une grande aventure',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const storedCarte: CarteRecord = {
    id: 10,
    campagneId: 42,
    name: 'Carte à supprimer',
    description: 'Desc',
    image: '/init.png',
    published: true,
    config: '{}',
    mjId: 1,
  };

  beforeEach(() => {
    deletedId = null;
    mockCarteRepo = {
      findById: async (id: number) => (id === 10 ? storedCarte : null),
      deleteCarte: async (id: number) => {
        deletedId = id;
      },
    };
    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
    };
    useCase = new DeleteCarteUseCase(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository,
      stubPermissions()
    );
  });

  it('should allow MJ to delete carte', async () => {
    await useCase.execute({
      carteId: 10,
      userId: 1, // MJ
    });

    assert.equal(deletedId, 10);
  });

  it('permet à un MJ Assistant (non propriétaire) de supprimer une carte', async () => {
    const assistantUseCase = new DeleteCarteUseCase(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository,
      stubAssistantPermissions()
    );

    await assistantUseCase.execute({
      carteId: 10,
      userId: 99, // MJ Assistant, le propriétaire est l'utilisateur 1
    });

    assert.equal(deletedId, 10);
  });

  it('should throw ForbiddenError if non-MJ tries to delete carte', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          carteId: 10,
          userId: 2, // player
        }),
      ForbiddenError
    );
  });

  it('should throw CarteNotFoundError if carte does not exist', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          carteId: 999,
          userId: 1,
        }),
      CarteNotFoundError
    );
  });
});
