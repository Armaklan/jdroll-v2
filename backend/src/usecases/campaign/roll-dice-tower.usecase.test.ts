import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RollDiceTowerUseCase } from './roll-dice-tower.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IDicerRepository, DicerRollWithUser } from '../../repositories/dicer.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import { CampaignSummary } from '../../types/index.js';

describe('RollDiceTowerUseCase', () => {
  const mockCampaign: CampaignSummary = {
    id: 10,
    mjId: 1,
    mjUsername: 'GM_User',
    mjAvatar: '',
    nbJoueurs: 5,
    nbJoueursActuel: 3,
    name: 'Campagne de Test',
    banniere: '',
    systeme: 'D&D 5E',
    univers: 'Fantasy',
    description: 'Une grande aventure',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
    rythme: 1,
    rp: 1,
  };

  const createMockCampaignRepo = (existingCampaign: CampaignSummary | null = mockCampaign): ICampaignRepository => ({
    findById: async (id: number) => (existingCampaign && existingCampaign.id === id ? existingCampaign : null),
    findMasteredCampaigns: async () => [],
    findPlayerCampaigns: async () => [],
    findAllCampaigns: async () => [],
    createCampaign: async () => 1,
    updateCampaign: async () => {},
    findCampaignCharacters: async () => [],
    findCampaignPnjCategories: async () => [],
    findCharacterById: async () => null,
    createCharacter: async () => 1,
    updateCharacter: async () => {},
    updateCampaignBanner: async () => {},
    findCampaignParticipants: async () => [],
  });

  const createMockForumRepo = (options: { isMj?: boolean; isParticipant?: boolean } = {}): IForumRepository =>
    ({
      isUserCampaignMj: async (_cId: number, userId: number) => (options.isMj !== undefined ? options.isMj : userId === 1),
      isUserCampaignParticipant: async (_cId: number, userId: number) => (options.isParticipant !== undefined ? options.isParticipant : userId === 2),
    } as any);

  const createMockDicerRepo = (): { repo: IDicerRepository; rolls: any[] } => {
    const rolls: any[] = [];
    return {
      rolls,
      repo: {
        createRoll: async (data) => {
          const id = rolls.length + 1;
          rolls.push({ id, ...data, createDate: new Date().toISOString() });
          return id;
        },
        getRollById: async (id) => rolls.find((r) => r.id === id) || null,
        getRollWithUserById: async (id) => {
          const r = rolls.find((item) => item.id === id);
          if (!r) return null;
          return {
            ...r,
            username: r.userId === 1 ? 'GM_User' : 'Player_User',
            userAvatar: null,
          };
        },
        getRecentRollsByCampaign: async (campagneId, limit = 20) =>
          rolls
            .filter((r) => r.campagneId === campagneId)
            .slice(-limit)
            .reverse()
            .map((r) => ({
              ...r,
              username: r.userId === 1 ? 'GM_User' : 'Player_User',
              userAvatar: null,
            })),
      },
    };
  };

  it('lève une ValidationError si la formule est vide', async () => {
    const { repo: dicerRepo } = createMockDicerRepo();
    const useCase = new RollDiceTowerUseCase(createMockCampaignRepo(), createMockForumRepo(), dicerRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 1, formula: '   ' }),
      ValidationError
    );
  });

  it('lève une CampaignNotFoundError si la campagne est introuvable', async () => {
    const { repo: dicerRepo } = createMockDicerRepo();
    const useCase = new RollDiceTowerUseCase(createMockCampaignRepo(null), createMockForumRepo(), dicerRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 999, userId: 1, formula: '1d20' }),
      CampaignNotFoundError
    );
  });

  it('lève une ForbiddenError si l utilisateur n est ni MJ ni joueur de la campagne', async () => {
    const { repo: dicerRepo } = createMockDicerRepo();
    const forumRepo = createMockForumRepo({ isMj: false, isParticipant: false });
    const useCase = new RollDiceTowerUseCase(createMockCampaignRepo(), forumRepo, dicerRepo);

    await assert.rejects(
      () => useCase.execute({ campaignId: 10, userId: 99, formula: '3d6' }),
      ForbiddenError
    );
  });

  it('exécute avec succès un jet de dé dans la Tour à dés et l enregistre dans dicer', async () => {
    const { repo: dicerRepo, rolls } = createMockDicerRepo();
    const forumRepo = createMockForumRepo({ isMj: true });
    // RNG déterministe simulant 0.5 (donc 1d8 donne 5)
    const deterministicRng = () => 0.5;
    const useCase = new RollDiceTowerUseCase(createMockCampaignRepo(), forumRepo, dicerRepo, deterministicRng);

    const result = await useCase.execute({
      campaignId: 10,
      userId: 1,
      formula: '1d8',
      description: 'Jet de discrétion',
    });

    assert.strictEqual(rolls.length, 1);
    assert.strictEqual(rolls[0].campagneId, 10);
    assert.strictEqual(rolls[0].userId, 1);
    assert.strictEqual(rolls[0].description, 'Jet de discrétion');
    assert.strictEqual(result.roll.result, 'd8 ( 5 ) = 5');
    assert.strictEqual(result.roll.username, 'GM_User');
    assert.strictEqual(result.evaluation.total, 5);
  });
});
