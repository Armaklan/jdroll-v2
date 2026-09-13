import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignQueries } from './campaign.queries.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { CampaignSummary } from '../types/index.js';

class MockCampaignRepository implements ICampaignRepository {
  constructor(
    private mastered: CampaignSummary[] = [],
    private player: CampaignSummary[] = [],
    private allCampaigns: CampaignSummary[] = []
  ) {}

  async findMasteredCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.mastered.filter((c) => c.mjId === userId && (includeArchived || !c.isArchived));
  }

  async findPlayerCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.player.filter((c) => (includeArchived || !c.isArchived));
  }

  async findAllCampaigns(options: { includeArchived?: boolean; search?: string } = {}): Promise<CampaignSummary[]> {
    const { includeArchived = false, search } = options;
    return this.allCampaigns.filter((c) => {
      if (!includeArchived && c.isArchived) {
        return false;
      }
      if (search && search.trim().length > 0) {
        const query = search.trim().toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesSysteme = c.systeme.toLowerCase().includes(query);
        const matchesUnivers = c.univers.toLowerCase().includes(query);
        return matchesName || matchesSysteme || matchesUnivers;
      }
      return true;
    });
  }

  async findById(id: number): Promise<CampaignSummary | null> {
    const all = [...this.mastered, ...this.player, ...this.allCampaigns];
    return all.find((c) => c.id === id) || null;
  }
}

describe('CampaignQueries', () => {
  const sampleMasteredCampaignActive: CampaignSummary = {
    id: 1,
    name: 'Campagne Active MJ',
    mjId: 42,
    mjUsername: 'admin',
    nbJoueurs: 4,
    nbJoueursActuel: 3,
    banniere: '',
    systeme: 'D&D 5',
    univers: 'Fantasy',
    description: 'Une aventure épique',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
    userRole: 'mj',
  };

  const sampleMasteredCampaignArchived: CampaignSummary = {
    id: 2,
    name: 'Campagne Archivée MJ',
    mjId: 42,
    mjUsername: 'admin',
    nbJoueurs: 5,
    nbJoueursActuel: 5,
    banniere: '',
    systeme: 'Call of Cthulhu',
    univers: 'Horreur',
    description: 'Une aventure sombre',
    statut: 2,
    isArchived: true,
    isRecrutementOpen: false,
    userRole: 'mj',
  };

  const samplePlayerCampaignActive: CampaignSummary = {
    id: 3,
    name: 'Campagne Joueur Active',
    mjId: 99,
    mjUsername: 'autre_mj',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    systeme: 'Cyberpunk',
    univers: 'Sci-fi',
    description: 'Aventure cyberpunk',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
    userRole: 'player',
    characterName: 'Neo',
  };

  const samplePlayerCampaignArchived: CampaignSummary = {
    id: 4,
    name: 'Campagne Joueur Archivée',
    mjId: 99,
    mjUsername: 'autre_mj',
    nbJoueurs: 3,
    nbJoueursActuel: 3,
    banniere: '',
    systeme: 'Shadowrun',
    univers: 'Cyber-Fantasy',
    description: 'Partie terminée',
    statut: 2,
    isArchived: true,
    isRecrutementOpen: false,
    userRole: 'player',
    characterName: 'Deckard',
  };

  it('should return only active mastered campaigns by default (includeArchived = false)', async () => {
    const repo = new MockCampaignRepository([sampleMasteredCampaignActive, sampleMasteredCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'master', false);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 1);
    assert.equal(result[0].isArchived, false);
  });

  it('should return all mastered campaigns when includeArchived = true', async () => {
    const repo = new MockCampaignRepository([sampleMasteredCampaignActive, sampleMasteredCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'master', true);
    assert.equal(result.length, 2);
  });

  it('should return only active player campaigns by default', async () => {
    const repo = new MockCampaignRepository([], [samplePlayerCampaignActive, samplePlayerCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'player', false);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 3);
    assert.equal(result[0].characterName, 'Neo');
  });

  it('should return all player campaigns when includeArchived = true', async () => {
    const repo = new MockCampaignRepository([], [samplePlayerCampaignActive, samplePlayerCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'player', true);
    assert.equal(result.length, 2);
  });

  it('should return only active campaigns by default for getAllCampaigns', async () => {
    const all = [
      sampleMasteredCampaignActive,
      sampleMasteredCampaignArchived,
      samplePlayerCampaignActive,
      samplePlayerCampaignArchived,
    ];
    const repo = new MockCampaignRepository([], [], all);
    const queries = new CampaignQueries(repo);

    const result = await queries.getAllCampaigns(false);
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((c) => c.id), [1, 3]);
  });

  it('should return all campaigns including archived for getAllCampaigns when includeArchived = true', async () => {
    const all = [
      sampleMasteredCampaignActive,
      sampleMasteredCampaignArchived,
      samplePlayerCampaignActive,
      samplePlayerCampaignArchived,
    ];
    const repo = new MockCampaignRepository([], [], all);
    const queries = new CampaignQueries(repo);

    const result = await queries.getAllCampaigns(true);
    assert.equal(result.length, 4);
  });

  it('should filter campaigns by search query on name, system, or univers', async () => {
    const all = [
      sampleMasteredCampaignActive, // name: 'Campagne Active MJ', systeme: 'D&D 5', univers: 'Fantasy'
      sampleMasteredCampaignArchived, // name: 'Campagne Archivée MJ', systeme: 'Call of Cthulhu', univers: 'Horreur' (archived)
      samplePlayerCampaignActive, // name: 'Campagne Joueur Active', systeme: 'Cyberpunk', univers: 'Sci-fi'
      samplePlayerCampaignArchived, // name: 'Campagne Joueur Archivée', systeme: 'Shadowrun', univers: 'Cyber-Fantasy' (archived)
    ];
    const repo = new MockCampaignRepository([], [], all);
    const queries = new CampaignQueries(repo);

    // Search by system in active campaigns
    const res1 = await queries.getAllCampaigns(false, 'Cyberpunk');
    assert.equal(res1.length, 1);
    assert.equal(res1[0].id, 3);

    // Search by universe in active campaigns
    const res2 = await queries.getAllCampaigns(false, 'fantasy');
    assert.equal(res2.length, 1);
    assert.equal(res2[0].id, 1);

    // Search by name in all campaigns (including archived)
    const res3 = await queries.getAllCampaigns(true, 'Archivée');
    assert.equal(res3.length, 2);
    assert.deepEqual(res3.map((c) => c.id), [2, 4]);

    // Search with no match
    const res4 = await queries.getAllCampaigns(true, 'Inexistant');
    assert.equal(res4.length, 0);
  });
});
