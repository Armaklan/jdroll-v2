import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateCharacterUseCase } from './create-character.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../../types/index.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

class MockCampaignRepository implements ICampaignRepository {
  public characters: RawCampaignCharacterRow[] = [];
  public nextId = 1;

  constructor(
    private campaigns: CampaignSummary[] = [],
    private categories: RawPnjCategoryRow[] = []
  ) {}

  async findMasteredCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findPlayerCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findAllCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findById(id: number): Promise<CampaignSummary | null> {
    return this.campaigns.find((c) => c.id === id) || null;
  }
  async findCampaignCharacters(campaignId: number): Promise<RawCampaignCharacterRow[]> {
    return this.characters.filter((c) => c.campagneId === campaignId);
  }
  async findCampaignPnjCategories(campaignId: number): Promise<RawPnjCategoryRow[]> {
    return this.categories.filter((c) => c.campagneId === campaignId);
  }
  async findCharacterById(id: number): Promise<RawCampaignCharacterRow | null> {
    return this.characters.find((c) => c.id === id) || null;
  }
  async createCharacter(character: any): Promise<number> {
    const id = this.nextId++;
    this.characters.push({
      id,
      userId: character.userId,
      userName: null,
      userAvatar: null,
      campagneId: character.campagneId,
      name: character.name,
      concept: character.concept,
      avatar: character.avatar,
      publicDescription: character.publicDescription,
      privateDescription: character.privateDescription,
      technical: character.technical,
      statut: character.statut,
      catId: character.catId,
      categoryName: null,
      persoFields: character.persoFields,
      widgets: character.widgets,
    });
    return id;
  }
  async updateCharacter(id: number, character: any): Promise<void> {
    const existing = this.characters.find((c) => c.id === id);
    if (existing) {
      Object.assign(existing, character);
    }
  }
  async createCampaign(): Promise<number> {
    return 1;
  }
  async updateCampaign(): Promise<void> {}
  async updateCampaignBanner(): Promise<void> {}
  async findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    return [];
  }
}

describe('CreateCharacterUseCase', () => {
  const campaign1: CampaignSummary = {
    id: 1,
    name: 'Campagne de test',
    mjId: 42,
    mjUsername: 'mj_user',
    mjAvatar: '',
    nbJoueurs: 4,
    nbJoueursActuel: 1,
    banniere: '',
    systeme: 'D&D',
    univers: 'Médiéval',
    description: '',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const categories: RawPnjCategoryRow[] = [
    { id: 10, campagneId: 1, name: 'Alliés', defaultCollapse: 0 },
    { id: 20, campagneId: 1, name: 'Ennemis', defaultCollapse: 1 },
  ];

  it('should successfully create a character as GM', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    const result = await useCase.execute({
      campagneId: 1,
      userId: 42,
      name: 'Gandalf',
      concept: 'Mage errant',
      avatar: 'https://example.com/gandalf.png',
      publicDescription: 'Un vieillard sage.',
      privateDescription: 'Possède l\'Anneau de Feu.',
      technical: 'Niveau 20',
      catId: 10,
    });

    assert.equal(result.id, 1);
    assert.equal(result.name, 'Gandalf');
    assert.equal(result.concept, 'Mage errant');
    assert.equal(result.catId, 10);
    assert.equal(result.userId, null);
    assert.equal(repo.characters.length, 1);
  });

  it('should successfully create a player character with assigned userId as GM', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    const result = await useCase.execute({
      campagneId: 1,
      userId: 42,
      name: 'Aragorn',
      concept: 'Rôdeur',
      assignedUserId: 5,
    });

    assert.equal(result.id, 1);
    assert.equal(result.name, 'Aragorn');
    assert.equal(result.userId, 5);
  });

  it('should throw ValidationError if name is empty', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 42,
          name: '   ',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /nom du personnage ne peut pas être vide/);
        return true;
      }
    );
  });

  it('should throw CampaignNotFoundError if campaign does not exist', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 999,
          userId: 42,
          name: 'Gandalf',
        });
      },
      (err: any) => {
        assert.ok(err instanceof CampaignNotFoundError);
        return true;
      }
    );
  });

  it('should throw ForbiddenError if user is not the GM', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 99, // Not the MJ
          name: 'Gandalf',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Seul le Maître du Jeu peut créer un personnage/);
        return true;
      }
    );
  });

  it('should throw ValidationError if category does not belong to the campaign', async () => {
    const repo = new MockCampaignRepository([campaign1], categories);
    const useCase = new CreateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          campagneId: 1,
          userId: 42,
          name: 'Gandalf',
          catId: 999,
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /catégorie/);
        return true;
      }
    );
  });
});
