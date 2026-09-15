import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateCampaignUseCase } from './update-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('UpdateCampaignUseCase', () => {
  const initialCampaign: CampaignSummary = {
    id: 1,
    mjId: 10,
    mjUsername: 'GM_User',
    name: 'Campagne Initiale',
    banniere: '',
    systeme: 'D&D 5E',
    univers: 'Fantasy',
    description: 'Une description',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
    rythme: 2,
    rp: 1,
    dialogueColor: '#3b82f6',
    penseeColor: '#a855f7',
  };

  const createMockCampaignRepo = (initialCampaigns: CampaignSummary[] = [initialCampaign]): {
    repo: ICampaignRepository;
    campaigns: CampaignSummary[];
  } => {
    const campaigns: CampaignSummary[] = initialCampaigns.map((c) => ({ ...c }));

    const repo: ICampaignRepository = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => campaigns.find((c) => c.id === id) || null,
      createCampaign: async () => 1,
      updateCampaign: async (id, data) => {
        const c = campaigns.find((item) => item.id === id);
        if (c) {
          if (data.name !== undefined) c.name = data.name;
          if (data.systeme !== undefined) c.systeme = data.systeme;
          if (data.univers !== undefined) c.univers = data.univers;
          if (data.description !== undefined) c.description = data.description;
          if (data.nbJoueurs !== undefined) c.nbJoueurs = data.nbJoueurs;
          if (data.banniere !== undefined) c.banniere = data.banniere;
          if (data.banniereForum !== undefined) c.banniereForum = data.banniereForum;
          if (data.statut !== undefined) {
            c.statut = data.statut;
            c.isArchived = data.statut === 2;
          }
          if (data.isRecrutementOpen !== undefined) c.isRecrutementOpen = data.isRecrutementOpen;
          if (data.rythme !== undefined) c.rythme = data.rythme;
          if (data.rp !== undefined) c.rp = data.rp;
          if (data.dialogueColor !== undefined) c.dialogueColor = data.dialogueColor;
          if (data.penseeColor !== undefined) c.penseeColor = data.penseeColor;
        }
      },
      findCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      updateCampaignBanner: async () => {},
      findCampaignParticipants: async () => [],
      isUserCampaignParticipant: async () => false,
      addCampaignParticipant: async () => {},
    };

    return { repo, campaigns };
  };

  const createMockForumRepo = (options: { isMj?: boolean } = {}): IForumRepository =>
    ({
      isUserCampaignMj: async (_cId: number, userId: number) => (options.isMj !== undefined ? options.isMj : userId === 10),
      isUserCampaignParticipant: async () => false,
    } as any);

  it('lève CampaignNotFoundError si la campagne n’existe pas', async () => {
    const { repo } = createMockCampaignRepo([]);
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 10, name: 'Nouveau nom' }),
      CampaignNotFoundError
    );
  });

  it('lève ForbiddenError si l’utilisateur n’est pas le MJ', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo({ isMj: false }));

    // User 99 is not GM
    await assert.rejects(
      () => useCase.execute({ campaignId: 1, userId: 99, name: 'Nouveau nom' }),
      ForbiddenError
    );
  });

  it('lève ValidationError si un champ fourni est invalide', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    await assert.rejects(
      () => useCase.execute({ campaignId: 1, userId: 10, name: '  ' }),
      ValidationError
    );

    await assert.rejects(
      () => useCase.execute({ campaignId: 1, userId: 10, nbJoueurs: 0 }),
      ValidationError
    );
  });

  it('met à jour avec succès la campagne et retourne ses nouvelles valeurs', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      name: 'Nouveau Titre de Campagne',
      systeme: 'Pathfinder 2E',
      univers: 'Golarion',
      statut: 1,
      isRecrutementOpen: false,
      dialogueColor: '#ef4444',
      penseeColor: '#10b981',
    });

    assert.equal(result.name, 'Nouveau Titre de Campagne');
    assert.equal(result.systeme, 'Pathfinder 2E');
    assert.equal(result.univers, 'Golarion');
    assert.equal(result.statut, 1);
    assert.equal(result.isRecrutementOpen, false);
    assert.equal(result.dialogueColor, '#ef4444');
    assert.equal(result.penseeColor, '#10b981');
  });

  it('met à jour correctement les différents statuts (3, 0, 1, 2), rythmes (1..5) et exigences rp (1..4)', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    // Statut 3 : En préparation, Rythme 5 : Plusieurs posts par jour, RP 4 : Cyrano
    const resultPrep = await useCase.execute({
      campaignId: 1,
      userId: 10,
      statut: 3,
      rythme: 5,
      rp: 4,
    });
    assert.equal(resultPrep.statut, 3);
    assert.equal(resultPrep.rythme, 5);
    assert.equal(resultPrep.rp, 4);

    // Statut 2 : Archivé
    const resultArchived = await useCase.execute({
      campaignId: 1,
      userId: 10,
      statut: 2,
      rythme: 1,
      rp: 1,
    });
    assert.equal(resultArchived.statut, 2);
    assert.equal(resultArchived.isArchived, true);
    assert.equal(resultArchived.rythme, 1);
    assert.equal(resultArchived.rp, 1);
  });
});
