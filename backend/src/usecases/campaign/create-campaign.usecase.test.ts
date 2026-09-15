import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateCampaignUseCase } from './create-campaign.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('CreateCampaignUseCase', () => {
  const createMockCampaignRepo = (initialCampaigns: CampaignSummary[] = []): {
    repo: ICampaignRepository;
    createdList: any[];
  } => {
    const campaigns: CampaignSummary[] = [...initialCampaigns];
    const createdList: any[] = [];

    const repo: ICampaignRepository = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => campaigns.find((c) => c.id === id) || null,
      createCampaign: async (data) => {
        const id = campaigns.length + 1;
        createdList.push({ id, ...data });
        const summary: CampaignSummary = {
          id,
          mjId: data.mjId,
          mjUsername: 'GM_User',
          name: data.name,
          banniere: data.banniere || '',
          banniereForum: data.banniereForum || null,
          systeme: data.systeme || '',
          univers: data.univers || '',
          description: data.description || '',
          nbJoueurs: data.nbJoueurs,
          nbJoueursActuel: 0,
          statut: data.statut ?? 0,
          isArchived: (data.statut ?? 0) === 2,
          isRecrutementOpen: data.isRecrutementOpen !== false,
          rythme: data.rythme ?? 1,
          rp: data.rp ?? 1,
          isMultiCharacter: Boolean(data.isMultiCharacter),
          dialogueColor: data.dialogueColor || null,
          penseeColor: data.penseeColor || null,
          rp1Color: data.rp1Color || null,
          rp2Color: data.rp2Color || null,
          quoteColor: data.quoteColor || null,
          sidebarColor: data.sidebarColor || null,
          oddLineColor: data.oddLineColor || null,
          evenLineColor: data.evenLineColor || null,
          textColor: data.textColor || null,
          linkColor: data.linkColor || null,
          linkSidebarColor: data.linkSidebarColor || null,
        };
        campaigns.push(summary);
        return id;
      },
      updateCampaign: async () => {},
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
    };

    return { repo, createdList };
  };

  it('lève une ValidationError si le nom est vide', async () => {
    const { repo } = createMockCampaignRepo();
    const useCase = new CreateCampaignUseCase(repo);

    await assert.rejects(
      () =>
        useCase.execute({
          mjId: 1,
          name: '   ',
          systeme: 'D&D 5E',
          univers: 'Fantasy',
          description: 'Aventure',
        }),
      ValidationError
    );
  });

  it('crée avec succès une campagne avec des champs optionnels vides', async () => {
    const { repo, createdList } = createMockCampaignRepo();
    const useCase = new CreateCampaignUseCase(repo);

    const result = await useCase.execute({
      mjId: 1,
      name: 'Campagne Simple',
    });

    assert.equal(result.name, 'Campagne Simple');
    assert.equal(result.systeme, '');
    assert.equal(result.univers, '');
    assert.equal(result.description, '');
    assert.equal(result.nbJoueurs, 4);
    assert.equal(createdList.length, 1);
  });

  it('crée avec succès une campagne avec vignette et bannière forum distinctes', async () => {
    const { repo, createdList } = createMockCampaignRepo();
    const useCase = new CreateCampaignUseCase(repo);

    const result = await useCase.execute({
      mjId: 10,
      name: 'La Cité des Ombres',
      systeme: 'Cthulhu Hack',
      univers: 'Années 20',
      description: '<p>Une grande enquête occulte.</p>',
      nbJoueurs: 5,
      banniere: 'https://images.com/vignette.png',
      banniereForum: 'https://images.com/banner-forum.png',
      dialogueColor: '#3b82f6',
      penseeColor: '#a855f7',
    });

    assert.equal(result.name, 'La Cité des Ombres');
    assert.equal(result.mjId, 10);
    assert.equal(result.systeme, 'Cthulhu Hack');
    assert.equal(result.univers, 'Années 20');
    assert.equal(result.nbJoueurs, 5);
    assert.equal(result.banniere, 'https://images.com/vignette.png');
    assert.equal(result.banniereForum, 'https://images.com/banner-forum.png');
    assert.equal(result.dialogueColor, '#3b82f6');
    assert.equal(result.penseeColor, '#a855f7');
    assert.equal(createdList.length, 1);
  });

  it('crée avec succès une campagne avec statut 3 (En préparation), rythme 4 (Plusieurs posts/jour) et exigence rp 3 (Cyrano)', async () => {
    const { repo, createdList } = createMockCampaignRepo();
    const useCase = new CreateCampaignUseCase(repo);

    const result = await useCase.execute({
      mjId: 10,
      name: 'Campagne Cyrano',
      statut: 3,
      rythme: 4,
      rp: 3,
    });

    assert.equal(result.name, 'Campagne Cyrano');
    assert.equal(result.statut, 3);
    assert.equal(result.rythme, 4);
    assert.equal(result.rp, 3);
    assert.equal(createdList.length, 1);
    assert.equal(createdList[0].statut, 3);
    assert.equal(createdList[0].rythme, 4);
    assert.equal(createdList[0].rp, 3);
  });
});
