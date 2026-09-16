import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateCarteUseCase } from './update-carte.usecase.js';
import { ICarteRepository, CarteRecord, UpdateCarteData } from '../../repositories/carte.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { CampaignSummary, RawCampaignCharacterRow } from '../../types/index.js';

describe('UpdateCarteUseCase', () => {
  let useCase: UpdateCarteUseCase;
  let mockCarteRepo: Partial<ICarteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let updatedData: UpdateCarteData | null = null;

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

  let storedCarte: CarteRecord | null = null;
  const storedCharacters: RawCampaignCharacterRow[] = [];

  beforeEach(() => {
    updatedData = null;
    storedCarte = {
      id: 10,
      campagneId: 42,
      name: 'Carte Initiale',
      description: 'Desc',
      image: '/init.png',
      published: true,
      config: JSON.stringify({
        markers: [
          { type: 'perso', id: '101', position: [10, 20], popup: [] },
          { type: 'perso', id: '102', position: [30, 40], popup: [] },
          { type: 'custom', id: 'c1', position: [50, 60], popup: { name: 'Coffre' } },
        ],
        tabReduce: false,
      }),
      mjId: 1,
    };

    storedCharacters.length = 0;
    storedCharacters.push(
      {
        id: 101,
        campagneId: 42,
        userId: 2, // player 2 owns character 101
        userName: 'Joueur1',
        userAvatar: null,
        name: 'Aragorn',
        concept: '',
        avatar: '',
        publicDescription: '',
        privateDescription: '',
        technical: '',
        statut: 0,
        catId: null,
        categoryName: '',
      },
      {
        id: 102,
        campagneId: 42,
        userId: 3, // player 3 owns character 102
        userName: 'Joueur2',
        userAvatar: null,
        name: 'Legolas',
        concept: '',
        avatar: '',
        publicDescription: '',
        privateDescription: '',
        technical: '',
        statut: 0,
        catId: null,
        categoryName: '',
      }
    );

    mockCarteRepo = {
      findById: async (id: number) => (id === 10 ? storedCarte : null),
      updateCarte: async (_id: number, data: UpdateCarteData) => {
        updatedData = data;
        if (storedCarte) {
          if (data.name !== undefined) storedCarte.name = data.name;
          if (data.description !== undefined) storedCarte.description = data.description;
          if (data.image !== undefined) storedCarte.image = data.image;
          if (data.published !== undefined) storedCarte.published = data.published;
          if (data.config !== undefined) storedCarte.config = data.config;
        }
      },
    };

    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
      findCampaignCharacters: async (campaignId: number) =>
        storedCharacters.filter((c) => c.campagneId === campaignId),
    };

    useCase = new UpdateCarteUseCase(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository
    );
  });

  it('should allow MJ to update all fields including custom markers and config', async () => {
    await useCase.execute({
      carteId: 10,
      userId: 1, // MJ
      name: 'Nouveau Nom',
      description: 'Nouvelle description',
      published: false,
      config: {
        markers: [{ type: 'custom', id: 'new_c', position: [100, 200], popup: { name: 'Boss' } }],
      },
    });

    assert.ok(updatedData);
    assert.equal(updatedData.name, 'Nouveau Nom');
    assert.equal(updatedData.description, 'Nouvelle description');
    assert.equal(updatedData.published, false);
    assert.ok(updatedData.config?.includes('Boss'));
  });

  it('should allow player to update only their own character token position', async () => {
    await useCase.execute({
      carteId: 10,
      userId: 2, // player 2 owning character 101
      config: {
        markers: [
          // Player 2 moved character 101 to [15, 25]
          { type: 'perso', id: '101', position: [15, 25], popup: [] },
          // Player 2 also tried to move character 102 and delete custom marker (should be prevented/ignored)
          { type: 'perso', id: '102', position: [999, 999], popup: [] },
        ],
      },
    });

    assert.ok(updatedData);
    const parsedConfig = JSON.parse(updatedData.config!);
    const p101 = parsedConfig.markers.find((m: any) => m.id === '101');
    const p102 = parsedConfig.markers.find((m: any) => m.id === '102');
    const custom = parsedConfig.markers.find((m: any) => m.id === 'c1');

    // 101 was updated to [15, 25]
    assert.deepEqual(p101.position, [15, 25]);
    // 102 remained at original [30, 40]
    assert.deepEqual(p102.position, [30, 40]);
    // Custom marker c1 was preserved
    assert.ok(custom);
    assert.deepEqual(custom.position, [50, 60]);
  });

  it('should allow player to add their own character token when not yet on map', async () => {
    // Supposons que le personnage 101 n'était pas sur la carte
    storedCarte!.config = JSON.stringify({
      markers: [
        { type: 'perso', id: '102', position: [30, 40], popup: [] },
        { type: 'custom', id: 'c1', position: [50, 60], popup: { name: 'Coffre' } },
      ],
      tabReduce: false,
    });

    await useCase.execute({
      carteId: 10,
      userId: 2, // player 2 owning character 101
      config: {
        markers: [
          // Player 2 adds character 101 for the first time
          { type: 'perso', id: '101', position: [100, 150], popup: { text: 'Arrivée' } },
        ],
      },
    });

    assert.ok(updatedData);
    const parsedConfig = JSON.parse(updatedData.config!);
    const p101 = parsedConfig.markers.find((m: any) => m.id === '101');
    const p102 = parsedConfig.markers.find((m: any) => m.id === '102');
    const custom = parsedConfig.markers.find((m: any) => m.id === 'c1');

    assert.ok(p101);
    assert.deepEqual(p101.position, [100, 150]);
    assert.deepEqual(p102.position, [30, 40]);
    assert.ok(custom);
  });

  it('should throw ForbiddenError if user has no assigned characters in campaign', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          carteId: 10,
          userId: 99, // unknown user
          config: { markers: [] },
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
          name: 'Test',
        }),
      CarteNotFoundError
    );
  });
});
