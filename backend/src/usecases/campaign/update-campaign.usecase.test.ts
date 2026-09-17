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
          if (data.rp1Color !== undefined) c.rp1Color = data.rp1Color;
          if (data.rp2Color !== undefined) c.rp2Color = data.rp2Color;
          if (data.quoteColor !== undefined) c.quoteColor = data.quoteColor;
          if (data.sidebarColor !== undefined) c.sidebarColor = data.sidebarColor;
          if (data.oddLineColor !== undefined) c.oddLineColor = data.oddLineColor;
          if (data.evenLineColor !== undefined) c.evenLineColor = data.evenLineColor;
          if (data.textColor !== undefined) c.textColor = data.textColor;
          if (data.linkColor !== undefined) c.linkColor = data.linkColor;
          if (data.linkSidebarColor !== undefined) c.linkSidebarColor = data.linkSidebarColor;
          if (data.width !== undefined) c.width = data.width;
          if (data.defaultDice !== undefined) c.defaultDice = data.defaultDice;
          if (data.defaultPersoId !== undefined) c.defaultPersoId = data.defaultPersoId;
          if (data.template !== undefined) c.template = data.template;
          if (data.templateHtml !== undefined) c.templateHtml = data.templateHtml;
          if (data.templateImg !== undefined) c.templateImg = data.templateImg;
          if (data.templateFields !== undefined) c.templateFields = data.templateFields;
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
      findObservedCampaigns: async () => [],
      isUserCampaignObserver: async () => false,
      addCampaignObserver: async () => {},
      removeCampaignObserver: async () => {},
      findCampaignObservers: async () => [],
      isUserCampaignAlert: async () => false,
      addCampaignAlert: async () => {},
      removeCampaignAlert: async () => {},
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

  it('met à jour correctement les différents statuts (3, 0, 1, 2), rythmes (0..4) et exigences rp (0..3)', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    // Statut 3 : En préparation, Rythme 4 : Plusieurs posts par jour, RP 3 : Cyrano
    const resultPrep = await useCase.execute({
      campaignId: 1,
      userId: 10,
      statut: 3,
      rythme: 4,
      rp: 3,
    });
    assert.equal(resultPrep.statut, 3);
    assert.equal(resultPrep.rythme, 4);
    assert.equal(resultPrep.rp, 3);

    // Statut 2 : Archivé, Rythme 0 : 1 post par mois, RP 0 : Roman de gare
    const resultArchived = await useCase.execute({
      campaignId: 1,
      userId: 10,
      statut: 2,
      rythme: 0,
      rp: 0,
    });
    assert.equal(resultArchived.statut, 2);
    assert.equal(resultArchived.isArchived, true);
    assert.equal(resultArchived.rythme, 0);
    assert.equal(resultArchived.rp, 0);
  });

  it('met à jour avec succès la configuration de la feuille de personnage (template_html, template_fields)', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      templateHtml: '<div class="sheet"><h1>Fiche</h1></div>',
      templateFields: '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="2"></div>',
      template: '<p>Nouveau template</p>',
    });

    assert.equal(result.templateHtml, '<div class="sheet"><h1>Fiche</h1></div>');
    assert.equal(result.templateFields, '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="2"></div>');
    assert.equal(result.template, '<p>Nouveau template</p>');
  });

  it('met à jour correctement une campagne avec un payload complet contenant des couleurs nulles et template vide', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    const payload = {
      name: 'Le secret du Poètes',
      systeme: '7Mer V3',
      univers: '7Mer',
      description: "<p>Une aventure d'épouvante au cœur des brumes de Barovie sous la coupe du seigneur vampire Strahd von Zarovich.</p>",
      nbJoueurs: 4,
      banniere: '/files/1/bbe069f24b893b1a3a1d7ead29c47095.png',
      banniereForum: '/files/1/bbe069f24b893b1a3a1d7ead29c47095.png',
      statut: 0,
      isRecrutementOpen: true,
      rythme: 2,
      rp: 2,
      isMultiCharacter: false,
      defaultDice: '1d20',
      dialogueColor: '#4488cc',
      penseeColor: '#8844cc',
      rp1Color: '#ff6600',
      rp2Color: '#5eff6c',
      quoteColor: null,
      sidebarColor: null,
      oddLineColor: null,
      evenLineColor: null,
      textColor: null,
      linkColor: null,
      linkSidebarColor: null,
      width: '800px',
      template: '',
      templateImg: '/files/1/4ec9f08b7524df922cf76b5553f4a882.jpg',
      templateHtml: '',
      templateFields: '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="0"></div>',
    };

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      ...payload,
    });

    assert.equal(result.name, 'Le secret du Poètes');
    assert.equal(result.systeme, '7Mer V3');
    assert.equal(result.univers, '7Mer');
    assert.equal(result.dialogueColor, '#4488cc');
    assert.equal(result.quoteColor, null);
    assert.equal(result.linkSidebarColor, '');
    assert.equal(result.template, '');
    assert.equal(result.templateImg, '/files/1/4ec9f08b7524df922cf76b5553f4a882.jpg');
    assert.equal(result.templateHtml, '<img id="zoneImg" src="/files/1/4ec9f08b7524df922cf76b5553f4a882.jpg" style="width: 800px">');
    assert.equal(result.templateFields, '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="0"></div>');
  });

  it('met à jour avec succès le PNJ par défaut (defaultPersoId)', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      defaultPersoId: 15,
    });

    assert.equal(result.defaultPersoId, 15);
  });
});
