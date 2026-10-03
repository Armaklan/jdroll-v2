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
import { CreateCarteUseCase } from './create-carte.usecase.js';
import { ICarteRepository, CreateCarteData } from '../../repositories/carte.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('CreateCarteUseCase', () => {
  let useCase: CreateCarteUseCase;
  let mockCarteRepo: Partial<ICarteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let createdData: CreateCarteData | null = null;

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

  beforeEach(() => {
    createdData = null;
    mockCarteRepo = {
      createCarte: async (data: CreateCarteData) => {
        createdData = data;
        return 123;
      },
    };
    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
    };
    useCase = new CreateCarteUseCase(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository,
      stubPermissions()
    );
  });

  it('should successfully create a carte for the MJ', async () => {
    const result = await useCase.execute({
      campaignId: 42,
      userId: 1,
      name: 'Carte du monde',
      description: 'Superbe carte',
      image: '/files/42/world.jpg',
      published: true,
      config: { markers: [] },
    });

    assert.equal(result.id, 123);
    assert.ok(createdData);
    assert.equal(createdData.name, 'Carte du monde');
    assert.equal(createdData.image, '/files/42/world.jpg');
    assert.equal(createdData.published, true);
  });

  it('permet à un MJ Assistant (non propriétaire) de créer une carte', async () => {
    const assistantUseCase = new CreateCarteUseCase(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository,
      stubAssistantPermissions()
    );

    const result = await assistantUseCase.execute({
      campaignId: 42,
      userId: 99, // MJ Assistant, le propriétaire est l'utilisateur 1
      name: 'Carte de l assistant',
      description: 'Créée par un assistant',
      image: '/files/42/assistant.jpg',
      published: true,
      config: { markers: [] },
    });

    assert.equal(result.id, 123);
  });

  it('should throw ForbiddenError if a non-MJ user tries to create a carte', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          campaignId: 42,
          userId: 2, // player
          name: 'Carte Pirate',
          image: '/files/42/pirate.jpg',
        }),
      ForbiddenError
    );
  });

  it('should throw ValidationError if name is empty', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          campaignId: 42,
          userId: 1,
          name: '',
          image: '/files/42/test.jpg',
        }),
      ValidationError
    );
  });

  it('should throw ValidationError if image is empty', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          campaignId: 42,
          userId: 1,
          name: 'Carte Test',
          image: '',
        }),
      ValidationError
    );
  });

  it('should throw CampaignNotFoundError if campaign does not exist', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          campaignId: 999,
          userId: 1,
          name: 'Carte Test',
          image: '/test.jpg',
        }),
      CampaignNotFoundError
    );
  });
});
