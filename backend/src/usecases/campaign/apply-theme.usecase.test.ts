import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApplyThemeUseCase } from './apply-theme.usecase.js';
import { ICampaignRepository, UpdateCampaignData } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IThemeRepository, ThemeDefinition } from '../../repositories/theme.repository.js';
import { CampaignNotFoundError, ForbiddenError, ThemeNotFoundError } from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('ApplyThemeUseCase', () => {
  let useCase: ApplyThemeUseCase;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let mockForumRepo: Partial<IForumRepository>;
  let mockThemeRepo: Partial<IThemeRepository>;
  let updateCampaignCalls: Array<{ id: number; data: UpdateCampaignData }>;

  const mockCampaign: CampaignSummary = {
    id: 42,
    name: 'Chronique des Héros',
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

  const mockTheme: ThemeDefinition = {
    id: 7,
    title: 'Médiéval',
    oddLineColor: '#f5f5f5',
    evenLineColor: '#e0e0e0',
    sidebarColor: '#dcdcdc',
    linkColor: '#8b4513',
    linkSidebarColor: '#4a235a',
    textColor: '#2c2c2c',
    dialogueColor: '#1a5276',
    penseeColor: '#5b2c6f',
    rp1Color: '#7d6608',
    rp2Color: '#6e2c00',
    quoteColor: '#555555',
  };

  beforeEach(() => {
    updateCampaignCalls = [];
    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
      updateCampaign: async (id: number, data: UpdateCampaignData) => {
        updateCampaignCalls.push({ id, data });
      },
    };
    mockForumRepo = {
      isUserCampaignMj: async () => false,
    };
    mockThemeRepo = {
      findById: async (id: number) => (id === 7 ? mockTheme : null),
    };
    useCase = new ApplyThemeUseCase(
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository,
      mockThemeRepo as IThemeRepository
    );
  });

  it('should apply theme colors to the campaign config when user is MJ', async () => {
    const result = await useCase.execute({ campaignId: 42, userId: 1, themeId: 7 });

    assert.equal(updateCampaignCalls.length, 1);
    assert.equal(updateCampaignCalls[0].id, 42);
    const data = updateCampaignCalls[0].data;
    assert.equal(data.dialogueColor, '#1a5276');
    assert.equal(data.penseeColor, '#5b2c6f');
    assert.equal(data.rp1Color, '#7d6608');
    assert.equal(data.rp2Color, '#6e2c00');
    assert.equal(data.quoteColor, '#555555');
    assert.equal(data.sidebarColor, '#dcdcdc');
    assert.equal(data.oddLineColor, '#f5f5f5');
    assert.equal(data.evenLineColor, '#e0e0e0');
    assert.equal(data.textColor, '#2c2c2c');
    assert.equal(data.linkColor, '#8b4513');
    assert.equal(data.linkSidebarColor, '#4a235a');
    assert.equal(result.id, 42);
  });

  it('should only update colors, no other campaign fields', async () => {
    await useCase.execute({ campaignId: 42, userId: 1, themeId: 7 });

    const data = updateCampaignCalls[0].data;
    assert.equal(data.name, undefined);
    assert.equal(data.description, undefined);
    assert.equal(data.banniere, undefined);
    assert.equal(data.template, undefined);
  });

  it('should allow a co-MJ to apply a theme', async () => {
    mockForumRepo = {
      isUserCampaignMj: async (campaignId: number, userId: number) => campaignId === 42 && userId === 5,
    };
    useCase = new ApplyThemeUseCase(
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository,
      mockThemeRepo as IThemeRepository
    );

    const result = await useCase.execute({ campaignId: 42, userId: 5, themeId: 7 });

    assert.equal(updateCampaignCalls.length, 1);
    assert.equal(result.id, 42);
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 1, themeId: 7 }),
      CampaignNotFoundError
    );
  });

  it('should throw ForbiddenError when user is not the MJ', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 42, userId: 2, themeId: 7 }),
      ForbiddenError
    );
    assert.equal(updateCampaignCalls.length, 0);
  });

  it('should throw ThemeNotFoundError when theme does not exist', async () => {
    await assert.rejects(
      () => useCase.execute({ campaignId: 42, userId: 1, themeId: 999 }),
      ThemeNotFoundError
    );
    assert.equal(updateCampaignCalls.length, 0);
  });
});
