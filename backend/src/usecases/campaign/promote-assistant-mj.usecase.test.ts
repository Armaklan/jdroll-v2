import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PromoteAssistantMjUseCase } from './promote-assistant-mj.usecase.js';
import { RemoveAssistantMjUseCase } from './remove-assistant-mj.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { FeatureFlipService } from '../feature/feature-flip.service.js';
import { IFeatureRepository } from '../../repositories/feature.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { CampaignSummary, FeatureFlip } from '../../types/index.js';

describe('PromoteAssistantMjUseCase', () => {
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

  let repo: ICampaignRepository;
  let addedAssistants: Array<{ campaignId: number; userId: number }>;
  let participants: Set<number>;

  const createFeatureFlip = (enabled: boolean): FeatureFlipService => {
    const featureRepo: IFeatureRepository = {
      findAll: async () => [],
      findByName: async (name: string): Promise<FeatureFlip | null> =>
        name === 'assistant-mj' ? { id: 1, name, description: '', enabled } : null,
      setEnabled: async () => {},
    };
    return new FeatureFlipService(featureRepo);
  };

  const createUseCase = (flagEnabled: boolean): PromoteAssistantMjUseCase =>
    new PromoteAssistantMjUseCase(repo, createFeatureFlip(flagEnabled));

  beforeEach(() => {
    addedAssistants = [];
    participants = new Set([20]);
    repo = {
      findById: async (id: number) => (id === campaign.id ? { ...campaign } : null),
      isUserCampaignParticipant: async (campaignId: number, userId: number) =>
        campaignId === campaign.id && participants.has(userId),
      isUserCampaignAssistant: async () => false,
      addCampaignAssistant: async (campaignId: number, userId: number) => {
        addedAssistants.push({ campaignId, userId });
      },
    } as unknown as ICampaignRepository;
  });

  it('promeut un participant en MJ assistant lorsque le feature flip est activé', async () => {
    const useCase = createUseCase(true);

    const result = await useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: 20 });

    assert.equal(result.success, true);
    assert.deepEqual(addedAssistants, [{ campaignId: campaign.id, userId: 20 }]);
  });

  it('refuse la promotion si le feature flip assistant-mj est désactivé', async () => {
    const useCase = createUseCase(false);

    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: 20 }),
      ForbiddenError
    );
    assert.equal(addedAssistants.length, 0);
  });

  it('refuse la promotion par un utilisateur qui n est pas le MJ propriétaire', async () => {
    const useCase = createUseCase(true);

    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 20, targetUserId: 30 }),
      ForbiddenError
    );
    assert.equal(addedAssistants.length, 0);
  });

  it('refuse la promotion du MJ propriétaire lui-même', async () => {
    const useCase = createUseCase(true);

    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: 10 }),
      ValidationError
    );
    assert.equal(addedAssistants.length, 0);
  });

  it('refuse la promotion d un utilisateur qui n est pas participant validé', async () => {
    const useCase = createUseCase(true);

    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: 30 }),
      ValidationError
    );
    assert.equal(addedAssistants.length, 0);
  });

  it('refuse la promotion sur une campagne inexistante', async () => {
    const useCase = createUseCase(true);

    await assert.rejects(
      useCase.execute({ campaignId: 999, mjId: 10, targetUserId: 20 }),
      CampaignNotFoundError
    );
  });

  it('refuse des identifiants invalides', async () => {
    const useCase = createUseCase(true);

    await assert.rejects(
      useCase.execute({ campaignId: 0, mjId: 10, targetUserId: 20 }),
      ValidationError
    );
    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: -1, targetUserId: 20 }),
      ValidationError
    );
    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: NaN }),
      ValidationError
    );
  });
});

describe('RemoveAssistantMjUseCase', () => {
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

  let repo: ICampaignRepository;
  let removedAssistants: Array<{ campaignId: number; userId: number }>;

  const createUseCase = (): RemoveAssistantMjUseCase => new RemoveAssistantMjUseCase(repo);

  beforeEach(() => {
    removedAssistants = [];
    repo = {
      findById: async (id: number) => (id === campaign.id ? { ...campaign } : null),
      removeCampaignAssistant: async (campaignId: number, userId: number) => {
        removedAssistants.push({ campaignId, userId });
      },
    } as unknown as ICampaignRepository;
  });

  it('rétrograde un MJ assistant à l initiative du MJ propriétaire', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({ campaignId: campaign.id, mjId: 10, targetUserId: 20 });

    assert.equal(result.success, true);
    assert.deepEqual(removedAssistants, [{ campaignId: campaign.id, userId: 20 }]);
  });

  it('rétrograde aussi un MJ assistant qui se rétrograde lui-même', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({ campaignId: campaign.id, mjId: 20, targetUserId: 20 });

    assert.equal(result.success, true);
    assert.deepEqual(removedAssistants, [{ campaignId: campaign.id, userId: 20 }]);
  });

  it('refuse la rétrogradation par un utilisateur qui n est ni propriétaire ni l assistant visé', async () => {
    const useCase = createUseCase();

    await assert.rejects(
      useCase.execute({ campaignId: campaign.id, mjId: 30, targetUserId: 20 }),
      ForbiddenError
    );
    assert.equal(removedAssistants.length, 0);
  });

  it('refuse la rétrogradation sur une campagne inexistante', async () => {
    const useCase = createUseCase();

    await assert.rejects(
      useCase.execute({ campaignId: 999, mjId: 10, targetUserId: 20 }),
      CampaignNotFoundError
    );
  });
});
