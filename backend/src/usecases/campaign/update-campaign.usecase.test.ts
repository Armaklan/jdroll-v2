import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateCampaignUseCase } from './update-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { FeatureFlipService } from '../feature/feature-flip.service.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { CampaignSummary, RawCampaignCharacterRow } from '../../types/index.js';

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

  const createMockCampaignRepo = (
    initialCampaigns: CampaignSummary[] = [initialCampaign],
    options: { characters?: RawCampaignCharacterRow[] } = {}
  ): {
    repo: ICampaignRepository;
    campaigns: CampaignSummary[];
    characterUpdates: Array<{ id: number; widgets?: string }>;
  } => {
    const campaigns: CampaignSummary[] = initialCampaigns.map((c) => ({ ...c }));
    const characterUpdates: Array<{ id: number; widgets?: string }> = [];
    const characters: RawCampaignCharacterRow[] = options.characters ?? [];

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
          if (data.sidebarText !== undefined) c.sidebarText = data.sidebarText;
          if (data.width !== undefined) c.width = data.width;
          if (data.defaultDice !== undefined) c.defaultDice = data.defaultDice;
          if (data.defaultPersoId !== undefined) c.defaultPersoId = data.defaultPersoId;
          if (data.template !== undefined) c.template = data.template;
          if (data.templateHtml !== undefined) c.templateHtml = data.templateHtml;
          if (data.templateImg !== undefined) c.templateImg = data.templateImg;
          if (data.templateFields !== undefined) c.templateFields = data.templateFields;
          if (data.sheetMode !== undefined) c.sheetMode = data.sheetMode;
          if (data.sheetDefinition !== undefined) c.sheetDefinition = data.sheetDefinition;
        }
      },
      findCampaignCharacters: async () => characters.map((c) => ({ ...c })),
      findCampaignPnjCategories: async () => [],
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async (id, data) => {
        characterUpdates.push({ id, widgets: data.widgets });
      },
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

    return { repo, campaigns, characterUpdates };
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

  it('met à jour avec succès le texte de la sidebar (sidebarText)', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      sidebarText: '<p>Informations rapides de la campagne</p>',
    });

    assert.equal(result.sidebarText, '<p>Informations rapides de la campagne</p>');
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

  describe('UpdateCampaignUseCase - widgets de campagne', () => {
    const makeCharacter = (id: number, widgets: string | null): RawCampaignCharacterRow => ({
      id,
      userId: null,
      userName: null,
      userAvatar: null,
      userProfil: null,
      campagneId: 1,
      name: `Perso ${id}`,
      concept: '',
      avatar: '',
      publicDescription: '',
      privateDescription: '',
      technical: '',
      statut: 0,
      catId: null,
      categoryName: null,
      persoFields: null,
      widgets,
      sheetValues: null,
    });

    it('retire des personnages les widgets supprimés de la configuration de la campagne', async () => {
      const characterWidgets = JSON.stringify([
        { id: 'w-1', name: 'Vie', type: 'jauge', low: 0, up: 100, value: 42 },
        { id: 'w-2', name: 'Or', type: 'token', low: 0, up: 0, value: 3 },
        { id: 'w-3', name: 'Reputation', type: 'text', low: 0, up: 0, value: 'connu' },
      ]);
      const { repo, characterUpdates } = createMockCampaignRepo([initialCampaign], {
        characters: [makeCharacter(101, characterWidgets), makeCharacter(102, null)],
      });
      const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

      const newWidgets = JSON.stringify([
        { id: 'w-1', name: 'Vie', type: 'jauge', low: 0, up: 100, value: 0 },
        { id: 'w-9', name: 'Reputation', type: 'text', low: 0, up: 0, value: '' },
      ]);

      await useCase.execute({ campaignId: 1, userId: 10, widgets: newWidgets });

      assert.equal(characterUpdates.length, 1);
      assert.equal(characterUpdates[0].id, 101);
      const kept = JSON.parse(characterUpdates[0].widgets as string);
      assert.deepEqual(kept.map((w: { id: string }) => w.id).sort(), ['w-1', 'w-3']);
      const vie = kept.find((w: { id: string }) => w.id === 'w-1');
      assert.equal(vie.value, 42);
    });

    it('vide les widgets des personnages quand la campagne ne définit plus aucun widget', async () => {
      const { repo, characterUpdates } = createMockCampaignRepo([initialCampaign], {
        characters: [makeCharacter(101, JSON.stringify([{ id: 'w-1', name: 'Vie', type: 'jauge', low: 0, up: 100, value: 10 }]))],
      });
      const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

      await useCase.execute({ campaignId: 1, userId: 10, widgets: '[]' });

      assert.equal(characterUpdates.length, 1);
      assert.deepEqual(JSON.parse(characterUpdates[0].widgets as string), []);
    });

    it('ne modifie pas les personnages si les widgets de campagne ne sont pas fournis', async () => {
      const { repo, characterUpdates } = createMockCampaignRepo([initialCampaign], {
        characters: [makeCharacter(101, JSON.stringify([{ id: 'w-1', name: 'Vie', type: 'jauge' }]))],
      });
      const useCase = new UpdateCampaignUseCase(repo, createMockForumRepo());

      await useCase.execute({ campaignId: 1, userId: 10, name: 'Nouveau Titre' });

      assert.equal(characterUpdates.length, 0);
    });
  });
  describe('UpdateCampaignUseCase - mode de feuille de personnage', () => {
  const validDefinition = {
    version: 1,
    pages: [
      {
        id: 'page-1',
        title: 'Identité',
        sections: [
          {
            id: 'sec-1',
            title: 'Principal',
            layout: 'vertical',
            children: [{ id: 'comp-nom', type: 'text', label: 'Nom' }],
          },
        ],
      },
    ],
  };

  const createFeatureRepo = (enabled: boolean) => ({
    findAll: async () => [],
    findByName: async () => ({ id: 1, name: 'programmed-sheet', description: '', enabled }),
    setEnabled: async () => {},
  });

  it('met à jour le mode technique et graphique sans feature flip', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      createMockForumRepo(),
      new FeatureFlipService(createFeatureRepo(false) as any)
    );

    const result = await useCase.execute({ campaignId: 1, userId: 10, sheetMode: 'graphic' });
    assert.equal(result.sheetMode, 'graphic');
  });

  it('lève ValidationError pour un mode inconnu', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      createMockForumRepo(),
      new FeatureFlipService(createFeatureRepo(true) as any)
    );

    await assert.rejects(
      () => useCase.execute({ campaignId: 1, userId: 10, sheetMode: 'holographique' }),
      ValidationError
    );
  });

  it('accepte le mode programmé et une définition valide quand la feature est active', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      createMockForumRepo(),
      new FeatureFlipService(createFeatureRepo(true) as any)
    );

    const result = await useCase.execute({
      campaignId: 1,
      userId: 10,
      sheetMode: 'programmed',
      sheetDefinition: JSON.stringify(validDefinition),
    });
    assert.equal(result.sheetMode, 'programmed');
    assert.deepEqual(JSON.parse(result.sheetDefinition as string), validDefinition);
  });

  it('refuse le mode programmé quand la feature est désactivée', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      createMockForumRepo(),
      new FeatureFlipService(createFeatureRepo(false) as any)
    );

    await assert.rejects(
      () => useCase.execute({
        campaignId: 1,
        userId: 10,
        sheetMode: 'programmed',
        sheetDefinition: JSON.stringify(validDefinition),
      }),
      ForbiddenError
    );
  });

  it('lève ValidationError si la définition de fiche est invalide', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new UpdateCampaignUseCase(
      repo,
      createMockForumRepo(),
      new FeatureFlipService(createFeatureRepo(true) as any)
    );

    await assert.rejects(
      () => useCase.execute({
        campaignId: 1,
        userId: 10,
        sheetMode: 'programmed',
        sheetDefinition: JSON.stringify({ version: 1, pages: [{ id: 'p', title: 'P' }] }),
      }),
      ValidationError
    );

    await assert.rejects(
      () => useCase.execute({
        campaignId: 1,
        userId: 10,
        sheetDefinition: 'pas du tout du json',
      }),
      ValidationError
    );
  });
});

});
