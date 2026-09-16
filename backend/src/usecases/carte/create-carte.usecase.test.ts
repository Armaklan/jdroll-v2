import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
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
      mockCampaignRepo as ICampaignRepository
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
