import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateCharacterUseCase } from './update-character.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../../types/index.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

class MockCampaignRepository implements ICampaignRepository {
  public characters: RawCampaignCharacterRow[] = [];

  constructor(
    private campaigns: CampaignSummary[] = [],
    private categories: RawPnjCategoryRow[] = [],
    characters: RawCampaignCharacterRow[] = []
  ) {
    this.characters = characters.map((c) => ({ ...c }));
  }

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
    const id = this.characters.length + 1;
    this.characters.push({ id, ...character });
    return id;
  }
  async updateCharacter(id: number, character: any): Promise<void> {
    const existing = this.characters.find((c) => c.id === id);
    if (existing) {
      Object.assign(existing, character);
    }
  }
  async findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    return [];
  }
}

describe('UpdateCharacterUseCase', () => {
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
  ];

  const characters: RawCampaignCharacterRow[] = [
    {
      id: 1,
      userId: 5, // Assigned to player 5
      userName: 'joueur5',
      userAvatar: null,
      campagneId: 1,
      name: 'Kaelen',
      concept: 'Mage',
      avatar: 'https://avatar.png',
      publicDescription: 'Publique',
      privateDescription: 'Secrète',
      technical: 'Tech',
      statut: 0,
      catId: null,
      categoryName: null,
      persoFields: null,
      widgets: '',
    },
    {
      id: 2,
      userId: null, // PNJ
      userName: null,
      userAvatar: null,
      campagneId: 1,
      name: 'Aubergiste',
      concept: 'Marchand',
      avatar: '',
      publicDescription: 'Publique',
      privateDescription: 'Secret PNJ',
      technical: '',
      statut: 0,
      catId: 10,
      categoryName: 'Alliés',
      persoFields: null,
      widgets: '',
    },
  ];

  it('should allow GM to edit any character including assignment and category', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    const result = await useCase.execute({
      characterId: 2,
      userId: 42, // GM
      name: 'Aubergiste Amélioré',
      concept: 'Maitre aubergiste',
      assignedUserId: 7,
      publicDescription: 'Nouvelle description',
    });

    assert.equal(result.name, 'Aubergiste Amélioré');
    assert.equal(result.concept, 'Maitre aubergiste');
    assert.equal(result.userId, 7);
    assert.equal(result.publicDescription, 'Nouvelle description');

    const updated = await repo.findCharacterById(2);
    assert.equal(updated?.name, 'Aubergiste Amélioré');
    assert.equal(updated?.userId, 7);
  });

  it('should allow player to edit their assigned character', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    const result = await useCase.execute({
      characterId: 1,
      userId: 5, // Player owner
      name: 'Kaelen Archimage',
      concept: 'Archimage puissant',
      publicDescription: 'Mis à jour',
      privateDescription: 'Nouveau secret',
    });

    assert.equal(result.name, 'Kaelen Archimage');
    assert.equal(result.concept, 'Archimage puissant');
    assert.equal(result.publicDescription, 'Mis à jour');
    assert.equal(result.privateDescription, 'Nouveau secret');
  });

  it('should ignore reassigning user or category if player attempts it', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    const result = await useCase.execute({
      characterId: 1,
      userId: 5, // Player
      name: 'Kaelen',
      assignedUserId: 99, // Should be ignored
      catId: 10, // Should be ignored
    });

    assert.equal(result.userId, 5); // Kept original
    assert.equal(result.catId, null); // Kept original
  });

  it('should throw ForbiddenError if user is neither GM nor assigned player', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 1,
          userId: 99, // Another user
          name: 'Hacked Name',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError);
        assert.match(err.message, /Vous n'avez pas l'autorisation/);
        return true;
      }
    );
  });

  it('should throw CharacterNotFoundError if character does not exist', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 999,
          userId: 42,
          name: 'Gandalf',
        });
      },
      (err: any) => {
        assert.ok(err instanceof CharacterNotFoundError);
        return true;
      }
    );
  });

  it('should throw ValidationError if updated name is empty', async () => {
    const repo = new MockCampaignRepository([campaign1], categories, characters);
    const useCase = new UpdateCharacterUseCase(repo);

    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 1,
          userId: 5,
          name: '   ',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );
  });
});
