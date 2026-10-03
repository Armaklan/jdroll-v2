import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignPermissionService } from './campaign-permission.service.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { FeatureFlipService } from '../usecases/feature/feature-flip.service.js';
import { IFeatureRepository } from '../repositories/feature.repository.js';
import { FeatureFlip, CampaignSummary } from '../types/index.js';

describe('CampaignPermissionService', () => {
  const campaign: CampaignSummary = {
    id: 1,
    mjId: 10,
    mjUsername: 'MJ',
    name: 'Campagne',
    banniere: '',
    systeme: 'D&D',
    univers: 'Fantasy',
    description: '',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const createMockCampaignRepo = (options: { assistants?: number[] } = {}): ICampaignRepository => {
    const assistants = new Set(options.assistants ?? []);
    return {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findObservedCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => (id === campaign.id ? { ...campaign } : null),
      createCampaign: async () => 1,
      updateCampaign: async () => {},
      findCampaignCharacters: async () => [],
      searchCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findPnjCategoryById: async () => null,
      createPnjCategory: async () => 1,
      updatePnjCategory: async () => {},
      deletePnjCategory: async () => {},
      findCharacterById: async () => null,
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      deleteCharacter: async () => {},
      isUserCampaignAssistant: async (campaignId: number, userId: number) =>
        campaignId === campaign.id && assistants.has(userId),
      findCampaignAssistants: async (campaignId: number) =>
        campaignId === campaign.id ? [...assistants].map((userId) => ({ userId })) : [],
      addCampaignAssistant: async (campaignId: number, userId: number) => {
        if (campaignId === campaign.id) assistants.add(userId);
      },
      removeCampaignAssistant: async (campaignId: number, userId: number) => {
        if (campaignId === campaign.id) assistants.delete(userId);
      },
      isUserCampaignParticipant: async () => false,
      isUserCampaignObserver: async () => false,
    } as unknown as ICampaignRepository;
  };

  const createFeatureFlip = (enabled: boolean): FeatureFlipService => {
    const featureRepo: IFeatureRepository = {
      findAll: async () => [],
      findByName: async (name: string): Promise<FeatureFlip | null> =>
        name === 'assistant-mj' ? { id: 1, name, description: '', enabled } : null,
      setEnabled: async () => {},
    };
    return new FeatureFlipService(featureRepo);
  };

  it('accorde les droits MJ au propriétaire même si le feature flip est désactivé', async () => {
    const service = new CampaignPermissionService(createMockCampaignRepo(), createFeatureFlip(false));

    assert.equal(await service.hasMjRights(campaign.id, campaign.mjId, campaign.mjId), true);
  });

  it('refuse les droits MJ à un joueur lorsque le feature flip est désactivé', async () => {
    const service = new CampaignPermissionService(
      createMockCampaignRepo({ assistants: [20] }),
      createFeatureFlip(false)
    );

    assert.equal(await service.hasMjRights(campaign.id, campaign.mjId, 20), false);
  });

  it('accorde les droits MJ au MJ assistant lorsque le feature flip est activé', async () => {
    const service = new CampaignPermissionService(
      createMockCampaignRepo({ assistants: [20] }),
      createFeatureFlip(true)
    );

    assert.equal(await service.hasMjRights(campaign.id, campaign.mjId, 20), true);
  });

  it('refuse les droits MJ à un joueur non assistant même si le feature flip est activé', async () => {
    const service = new CampaignPermissionService(createMockCampaignRepo(), createFeatureFlip(true));

    assert.equal(await service.hasMjRights(campaign.id, campaign.mjId, 20), false);
  });

  it('détecte le rôle assistant uniquement lorsque le feature flip est activé', async () => {
    const repo = createMockCampaignRepo({ assistants: [20] });
    const serviceDisabled = new CampaignPermissionService(repo, createFeatureFlip(false));
    const serviceEnabled = new CampaignPermissionService(repo, createFeatureFlip(true));

    assert.equal(await serviceDisabled.isAssistantMj(campaign.id, 20), false);
    assert.equal(await serviceEnabled.isAssistantMj(campaign.id, 20), true);
    assert.equal(await serviceEnabled.isAssistantMj(campaign.id, 30), false);
  });

  it('tolère un repository sans méthode assistant (retourne false)', async () => {
    const repo = createMockCampaignRepo({ assistants: [20] });
    delete (repo as Partial<ICampaignRepository>).isUserCampaignAssistant;
    const service = new CampaignPermissionService(repo, createFeatureFlip(true));

    assert.equal(await service.isAssistantMj(campaign.id, 20), false);
  });
});
