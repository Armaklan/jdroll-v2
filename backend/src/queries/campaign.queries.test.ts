import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CampaignQueries } from './campaign.queries.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { IDicerRepository, DicerRollWithUser } from '../repositories/dicer.repository.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import { ICarteRepository } from '../repositories/carte.repository.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow } from '../types/index.js';
import { CampaignNotFoundError, CharacterNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

class MockDicerRepository implements IDicerRepository {
  constructor(private rolls: DicerRollWithUser[] = []) {}

  async createRoll(): Promise<number> {
    return 1;
  }

  async getRollById(): Promise<any> {
    return null;
  }

  async getRollWithUserById(): Promise<any> {
    return null;
  }

  async getRecentRollsByCampaign(campagneId: number, limit = 20, userId?: number): Promise<DicerRollWithUser[]> {
    return this.rolls
      .filter((r) => r.campagneId === campagneId && (userId === undefined || r.userId === userId))
      .slice(0, limit);
  }
}

class MockForumRepository implements Partial<IForumRepository> {
  constructor(
    private mjList: Array<{ campaignId: number; userId: number }> = [],
    private participantList: Array<{ campaignId: number; userId: number }> = [],
    private topics: Array<{ id: number; campaignId: number; sectionId: number; sectionTitle: string; title: string; isPrivate: number; canReadUserIds?: number[] }> = []
  ) {}

  async isUserCampaignMj(campagneId: number, userId: number): Promise<boolean> {
    return this.mjList.some((item) => item.campaignId === campagneId && item.userId === userId);
  }

  async isUserCampaignParticipant(campagneId: number, userId: number): Promise<boolean> {
    return this.participantList.some((item) => item.campaignId === campagneId && item.userId === userId);
  }

  async searchCampaignTopics(campaignId: number, queryText: string, userId?: number, isMj: boolean = false): Promise<any[]> {
    const q = queryText.trim().toLowerCase();
    return this.topics.filter((t) => {
      if (t.campaignId !== campaignId) return false;
      if (t.isPrivate === 1 && !isMj) {
        if (!userId || !t.canReadUserIds?.includes(userId)) return false;
      }
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }
}

class MockCarteRepository implements Partial<ICarteRepository> {
  constructor(
    private cartes: Array<{ id: number; campagneId: number; name: string; description: string; image: string; published: boolean }> = []
  ) {}

  async searchCampaignCartes(campaignId: number, queryText: string, withUnpublished: boolean = false): Promise<any[]> {
    const q = queryText.trim().toLowerCase();
    return this.cartes.filter((c) => {
      if (c.campagneId !== campaignId) return false;
      if (!withUnpublished && !c.published) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }
}

class MockCampaignRepository implements ICampaignRepository {
  constructor(
    private mastered: CampaignSummary[] = [],
    private player: CampaignSummary[] = [],
    private allCampaigns: CampaignSummary[] = [],
    private characters: RawCampaignCharacterRow[] = [],
    private categories: RawPnjCategoryRow[] = [],
    private observed: CampaignSummary[] = []
  ) {}

  async findMasteredCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.mastered.filter((c) => c.mjId === userId && (includeArchived || !c.isArchived));
  }

  async findPlayerCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.player.filter((c) => (includeArchived || !c.isArchived));
  }

  async findObservedCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.observed.filter((c) => (includeArchived || !c.isArchived));
  }

  async findAllCampaigns(options: { includeArchived?: boolean; search?: string; includePreparation?: boolean } = {}): Promise<CampaignSummary[]> {
    const { includeArchived = false, search, includePreparation = false } = options;
    return this.allCampaigns.filter((c) => {
      if (!includePreparation && c.statut === 3) {
        return false;
      }
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
    const all = [...this.mastered, ...this.player, ...this.allCampaigns, ...this.observed];
    return all.find((c) => c.id === id) || null;
  }

  async findCampaignCharacters(campaignId: number): Promise<RawCampaignCharacterRow[]> {
    return this.characters.filter((char) => char.campagneId === campaignId);
  }

  async searchCampaignCharacters(campaignId: number, queryText: string): Promise<RawCampaignCharacterRow[]> {
    const q = queryText.trim().toLowerCase();
    return this.characters.filter((char) => {
      if (char.campagneId !== campaignId) return false;
      if (q && !char.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  async findCampaignPnjCategories(campaignId: number): Promise<RawPnjCategoryRow[]> {
    return this.categories.filter((cat) => cat.campagneId === campaignId);
  }

  async findCharacterById(id: number): Promise<RawCampaignCharacterRow | null> {
    return this.characters.find((char) => char.id === id) || null;
  }

  async createCharacter(character: any): Promise<number> {
    return 1;
  }

  async updateCharacter(id: number, character: any): Promise<void> {}

  async deleteCharacter(id: number): Promise<void> {}

  async findPnjCategoryById(id: number): Promise<RawPnjCategoryRow | null> {
    return this.categories.find((cat) => cat.id === id) || null;
  }

  async createPnjCategory(category: any): Promise<number> {
    return 1;
  }

  async updatePnjCategory(id: number, category: any): Promise<void> {}

  async deletePnjCategory(id: number): Promise<void> {}

  async createCampaign(data: any): Promise<number> {
    return 1;
  }

  async updateCampaign(id: number, data: any): Promise<void> {}

  async updateCampaignBanner(campagneId: number, bannerUrl: string): Promise<void> {}

  async findCampaignParticipants(campaignId: number): Promise<any[]> {
    return [];
  }

  async isUserCampaignParticipant(campaignId: number, userId: number): Promise<boolean> {
    return false;
  }

  async addCampaignParticipant(campaignId: number, userId: number): Promise<void> {}

  async isUserCampaignObserver(campaignId: number, userId: number): Promise<boolean> {
    return this.observed.some((c) => c.id === campaignId);
  }

  async addCampaignObserver(campaignId: number, userId: number): Promise<void> {}

  async removeCampaignObserver(campaignId: number, userId: number): Promise<void> {}

  async findCampaignObservers(campaignId: number): Promise<any[]> {
    return [];
  }

  async isUserCampaignAlert(campaignId: number, userId: number): Promise<boolean> {
    const all = [...this.mastered, ...this.player, ...this.allCampaigns, ...this.observed];
    const c = all.find((item) => item.id === campaignId);
    return Boolean(c?.hasAlert);
  }

  async addCampaignAlert(campaignId: number, userId: number): Promise<void> {}

  async removeCampaignAlert(campaignId: number, userId: number): Promise<void> {}
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

  const sampleObservedCampaignActive: CampaignSummary = {
    id: 6,
    name: 'Campagne Observateur Active',
    mjId: 88,
    mjUsername: 'tiers_mj',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    systeme: 'Call of Cthulhu',
    univers: 'Horreur',
    description: 'Aventure observée',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: false,
    userRole: 'observer',
    isObserving: true,
  };

  const sampleObservedCampaignArchived: CampaignSummary = {
    id: 7,
    name: 'Campagne Observateur Archivée',
    mjId: 88,
    mjUsername: 'tiers_mj',
    nbJoueurs: 3,
    nbJoueursActuel: 3,
    banniere: '',
    systeme: 'Vampire',
    univers: 'Gothique',
    description: 'Partie observée terminée',
    statut: 2,
    isArchived: true,
    isRecrutementOpen: false,
    userRole: 'observer',
    isObserving: true,
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

  it('should return only active observed campaigns by default when role = "observer"', async () => {
    const repo = new MockCampaignRepository([], [], [], [], [], [sampleObservedCampaignActive, sampleObservedCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'observer', false);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 6);
    assert.equal(result[0].userRole, 'observer');
    assert.equal(result[0].isObserving, true);
  });

  it('should return all observed campaigns when role = "observer" and includeArchived = true', async () => {
    const repo = new MockCampaignRepository([], [], [], [], [], [sampleObservedCampaignActive, sampleObservedCampaignArchived]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'observer', true);
    assert.equal(result.length, 2);
  });

  it('should return active mastered, player and observed campaigns when role = "all" or omitted', async () => {
    const repo = new MockCampaignRepository(
      [sampleMasteredCampaignActive, sampleMasteredCampaignArchived],
      [samplePlayerCampaignActive, samplePlayerCampaignArchived],
      [],
      [],
      [],
      [sampleObservedCampaignActive, sampleObservedCampaignArchived]
    );
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'all', false);
    assert.equal(result.length, 3);
    assert.deepEqual(result.map((c) => c.id).sort(), [1, 3, 6]);

    const resultAll = await queries.getMyCampaigns(42, 'all', true);
    assert.equal(resultAll.length, 6);
  });

  it('should sort campaigns with hasAlert = true first in getMyCampaigns', async () => {
    const campaignWithoutAlert: CampaignSummary = {
      ...sampleMasteredCampaignActive,
      id: 10,
      name: 'Campagne sans alerte',
      hasAlert: false,
    };
    const campaignWithAlert: CampaignSummary = {
      ...samplePlayerCampaignActive,
      id: 5,
      name: 'Campagne avec alerte',
      hasAlert: true,
    };
    const repo = new MockCampaignRepository([campaignWithoutAlert], [campaignWithAlert]);
    const queries = new CampaignQueries(repo);

    const result = await queries.getMyCampaigns(42, 'all', false);
    assert.equal(result.length, 2);
    assert.equal(result[0].id, 5); // hasAlert is true, should be first even though id 5 < 10
    assert.equal(result[1].id, 10);
  });

  it('should return only active campaigns by default for getAllCampaigns', async () => {
    const samplePreparationCampaign: CampaignSummary = {
      id: 5,
      name: 'Campagne En Préparation',
      mjId: 42,
      mjUsername: 'admin',
      nbJoueurs: 4,
      nbJoueursActuel: 1,
      banniere: '',
      systeme: 'D&D 5',
      univers: 'Fantasy',
      description: 'Campagne pas prête',
      statut: 3,
      isArchived: false,
      isRecrutementOpen: true,
      userRole: 'mj',
    };

    const all = [
      sampleMasteredCampaignActive,
      sampleMasteredCampaignArchived,
      samplePlayerCampaignActive,
      samplePlayerCampaignArchived,
      samplePreparationCampaign,
    ];
    const repo = new MockCampaignRepository([], [], all);
    const queries = new CampaignQueries(repo);

    const result = await queries.getAllCampaigns(false);
    assert.equal(result.length, 2);
    assert.deepEqual(result.map((c) => c.id), [1, 3]);
  });

  it('should return campaigns including preparation when includePreparation = true', async () => {
    const samplePreparationCampaign: CampaignSummary = {
      id: 5,
      name: 'Campagne En Préparation',
      mjId: 42,
      mjUsername: 'admin',
      nbJoueurs: 4,
      nbJoueursActuel: 1,
      banniere: '',
      systeme: 'D&D 5',
      univers: 'Fantasy',
      description: 'Campagne pas prête',
      statut: 3,
      isArchived: false,
      isRecrutementOpen: true,
      userRole: 'mj',
    };

    const all = [
      sampleMasteredCampaignActive,
      sampleMasteredCampaignArchived,
      samplePlayerCampaignActive,
      samplePlayerCampaignArchived,
      samplePreparationCampaign,
    ];
    const repo = new MockCampaignRepository([], [], all);
    const queries = new CampaignQueries(repo);

    const result = await queries.getAllCampaigns(false, undefined, true);
    assert.equal(result.length, 3);
    assert.deepEqual(result.map((c) => c.id), [1, 3, 5]);
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

  describe('getCampaignCharacters', () => {
    const campaign1: CampaignSummary = {
      id: 1,
      name: 'La Malédiction de Strahd',
      mjId: 1,
      mjUsername: 'admin',
      nbJoueurs: 4,
      nbJoueursActuel: 2,
      banniere: '',
      systeme: 'D&D 5e',
      univers: 'Ravenloft',
      description: 'Test',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: true,
    };

    const categories: RawPnjCategoryRow[] = [
      { id: 10, campagneId: 1, name: 'Noblesse de Barovie', defaultCollapse: 0 },
      { id: 20, campagneId: 1, name: 'Ordre de la Plume', defaultCollapse: 1 },
    ];

    const characters: RawCampaignCharacterRow[] = [
      {
        id: 1,
        userId: 2,
        userName: 'joueur1',
        userAvatar: '',
        campagneId: 1,
        name: 'Kaelen',
        concept: 'Mage de bataille',
        avatar: 'http://avatar1.png',
        publicDescription: 'Mage discret',
        privateDescription: 'Secret de mage',
        technical: 'Niveau 5',
        statut: 0,
        catId: null,
        categoryName: null,
        persoFields: null,
        widgets: null,
      },
      {
        id: 2,
        userId: null,
        userName: null,
        userAvatar: null,
        campagneId: 1,
        name: 'Strahd von Zarovich',
        concept: 'Seigneur vampire',
        avatar: 'http://strahd.png',
        publicDescription: 'Maitre des lieux',
        privateDescription: 'Faiblesses du vampire',
        technical: 'CR 15',
        statut: 0,
        catId: 10,
        categoryName: 'Noblesse de Barovie',
        persoFields: null,
        widgets: null,
      },
      {
        id: 3,
        userId: null,
        userName: null,
        userAvatar: null,
        campagneId: 1,
        name: 'Aubergiste Danovich',
        concept: 'Commerçant jovial',
        avatar: '',
        publicDescription: 'Tient la taverne',
        privateDescription: 'Informateur secret',
        technical: '',
        statut: 0,
        catId: null,
        categoryName: null,
        persoFields: null,
        widgets: null,
      },
    ];

    it('should throw CampaignNotFoundError when campaign does not exist', async () => {
      const repo = new MockCampaignRepository();
      const queries = new CampaignQueries(repo);
      await assert.rejects(
        async () => {
          await queries.getCampaignCharacters(999);
        },
        (err: any) => {
          assert.ok(err instanceof CampaignNotFoundError);
          return true;
        }
      );
    });

    it('should classify characters by category: custom category, "Personnage joueur" for PJ without category, "Non classées" for PNJ without category', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], characters, categories);
      const queries = new CampaignQueries(repo);

      const data = await queries.getCampaignCharacters(1, 1); // User 1 is MJ
      assert.equal(data.campaign.name, 'La Malédiction de Strahd');
      assert.equal(data.campaign.userRole, 'mj');

      // Categories should have:
      // 1. Noblesse de Barovie (with Strahd)
      // 2. Ordre de la Plume (0 characters)
      // 3. Personnage joueur (with Kaelen)
      // 4. Non classées (with Danovich)
      assert.equal(data.categories.length, 4);

      const catNoblesse = data.categories.find((c) => c.name === 'Noblesse de Barovie');
      assert.ok(catNoblesse);
      assert.equal(catNoblesse.characters.length, 1);
      assert.equal(catNoblesse.characters[0].name, 'Strahd von Zarovich');
      assert.equal(catNoblesse.characters[0].concept, 'Seigneur vampire');
      assert.equal(catNoblesse.characters[0].isPlayer, false);
      // MJ can see privateDescription
      assert.equal(catNoblesse.characters[0].privateDescription, 'Faiblesses du vampire');

      const catPJ = data.categories.find((c) => c.name === 'Personnage joueur');
      assert.ok(catPJ);
      assert.equal(catPJ.characters.length, 1);
      assert.equal(catPJ.characters[0].name, 'Kaelen');
      assert.equal(catPJ.characters[0].isPlayer, true);
      assert.equal(catPJ.characters[0].userName, 'joueur1');

      const catNonClasses = data.categories.find((c) => c.name === 'Non classées');
      assert.ok(catNonClasses);
      assert.equal(catNonClasses.characters.length, 1);
      assert.equal(catNonClasses.characters[0].name, 'Aubergiste Danovich');
      assert.equal(catNonClasses.characters[0].isPlayer, false);
    });

    it('should hide private description for users who are not GM and not character owner', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], characters, categories);
      const queries = new CampaignQueries(repo, new MockDicerRepository(), new MockForumRepository() as any);

      const data = await queries.getCampaignCharacters(1, 99); // Another user
      const catPJ = data.categories.find((c) => c.name === 'Personnage joueur')!;
      assert.equal(catPJ.characters[0].privateDescription, undefined);

      const catNoblesse = data.categories.find((c) => c.name === 'Noblesse de Barovie')!;
      assert.equal(catNoblesse.characters[0].privateDescription, undefined);
    });

    it('should reveal private description to the character owner', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], characters, categories);
      const queries = new CampaignQueries(repo, new MockDicerRepository(), new MockForumRepository() as any);

      const data = await queries.getCampaignCharacters(1, 2); // User 2 is Kaelen's owner
      const catPJ = data.categories.find((c) => c.name === 'Personnage joueur')!;
      assert.equal(catPJ.characters[0].privateDescription, 'Secret de mage');

      const catNoblesse = data.categories.find((c) => c.name === 'Noblesse de Barovie')!;
      assert.equal(catNoblesse.characters[0].privateDescription, undefined);
    });
  });

  describe('getCharacter', () => {
    const campaign1: CampaignSummary = {
      id: 1,
      name: 'La Malédiction de Strahd',
      mjId: 1, // GM is user 1
      mjUsername: 'mj_user',
      nbJoueurs: 4,
      nbJoueursActuel: 2,
      banniere: '',
      systeme: 'D&D 5',
      univers: 'Gothique',
      description: 'Une aventure en Barovie',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: true,
      userRole: 'mj',
      templateImg: 'template.png',
      templateFields: '[]',
      widgets: JSON.stringify([{ id: 'w1', name: 'HP', type: 'jauge', low: 0, up: 20, value: 20 }]),
    };

    const characterPj: RawCampaignCharacterRow = {
      id: 101,
      userId: 2,
      userName: 'joueur1',
      userAvatar: null,
      userProfil: 1,
      campagneId: 1,
      name: 'Kaelen',
      concept: 'Mage évocateur',
      avatar: 'kaelen.png',
      publicDescription: 'Un magicien studieux',
      privateDescription: 'Secret de mage',
      technical: 'INT: 18, FOR: 8',
      statut: 0,
      catId: null,
      categoryName: null,
      persoFields: '{"HP": 15}',
      widgets: JSON.stringify([{ id: 'w1', value: 15 }]),
    };

    it('lève CharacterNotFoundError si le personnage n’existe pas', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], []);
      const queries = new CampaignQueries(repo);
      await assert.rejects(() => queries.getCharacter(999, 1), CharacterNotFoundError);
    });

    it('retourne le personnage avec descriptions privées et widgets pour le MJ', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], [characterPj]);
      const queries = new CampaignQueries(repo);
      const res = await queries.getCharacter(101, 1); // User 1 is MJ

      assert.equal(res.character.id, 101);
      assert.equal(res.character.name, 'Kaelen');
      assert.equal(res.character.privateDescription, 'Secret de mage');
      assert.equal(res.character.technical, 'INT: 18, FOR: 8');
      assert.ok(res.character.widgets);
      assert.equal(res.campaign.name, 'La Malédiction de Strahd');
      assert.equal(res.campaign.templateImg, 'template.png');
    });

    it('retourne le personnage avec descriptions privées pour son propriétaire joueur', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], [characterPj]);
      const queries = new CampaignQueries(repo);
      const res = await queries.getCharacter(101, 2); // User 2 is character owner

      assert.equal(res.character.privateDescription, 'Secret de mage');
      assert.equal(res.character.technical, 'INT: 18, FOR: 8');
      assert.ok(res.character.widgets);
    });

    it('masque les descriptions privées et widgets pour un autre utilisateur', async () => {
      const repo = new MockCampaignRepository([campaign1], [], [], [characterPj]);
      const queries = new CampaignQueries(repo);
      const res = await queries.getCharacter(101, 3); // User 3 is unrelated

      assert.equal(res.character.privateDescription, undefined);
      assert.equal(res.character.technical, undefined);
      assert.equal(res.character.widgets, undefined);
    });
  });

  describe('getCampaignDiceRolls', () => {
    const campaign1: CampaignSummary = {
      id: 10,
      name: 'Campagne avec Tour à dés',
      mjId: 1, // GM is user 1
      mjUsername: 'mj_user',
      nbJoueurs: 4,
      nbJoueursActuel: 2,
      banniere: '',
      systeme: 'D&D 5',
      univers: 'Fantasy',
      description: 'Campagne de test dés',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: true,
      userRole: 'mj',
    };

    const rolls: DicerRollWithUser[] = [
      {
        id: 1,
        userId: 1,
        campagneId: 10,
        createDate: '2026-09-14T10:00:00Z',
        result: 'd20 ( 18 )',
        description: 'Jet MJ',
        username: 'mj_user',
        userAvatar: null,
      },
      {
        id: 2,
        userId: 2,
        campagneId: 10,
        createDate: '2026-09-14T10:05:00Z',
        result: 'd6 ( 4 ) + d6 ( 5 ) = 9',
        description: 'Attaque Joueur 1',
        username: 'joueur1',
        userAvatar: null,
      },
      {
        id: 3,
        userId: 3,
        campagneId: 10,
        createDate: '2026-09-14T10:10:00Z',
        result: 'd100 ( 42 )',
        description: 'Chance Joueur 2',
        username: 'joueur2',
        userAvatar: null,
      },
    ];

    it('lève CampaignNotFoundError si la campagne n’existe pas', async () => {
      const campaignRepo = new MockCampaignRepository();
      const dicerRepo = new MockDicerRepository(rolls);
      const forumRepo = new MockForumRepository() as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo);

      await assert.rejects(
        () => queries.getCampaignDiceRolls(999, 1),
        CampaignNotFoundError
      );
    });

    it('lève ForbiddenError si l’utilisateur n’est ni MJ ni joueur', async () => {
      const campaignRepo = new MockCampaignRepository([campaign1]);
      const dicerRepo = new MockDicerRepository(rolls);
      const forumRepo = new MockForumRepository(
        [{ campaignId: 10, userId: 1 }],
        [{ campaignId: 10, userId: 2 }]
      ) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo);

      // Utilisateur 99 n'est ni MJ ni joueur
      await assert.rejects(
        () => queries.getCampaignDiceRolls(10, 99),
        ForbiddenError
      );
    });

    it('retourne TOUS les jets de dés si l’utilisateur est le MJ', async () => {
      const campaignRepo = new MockCampaignRepository([campaign1]);
      const dicerRepo = new MockDicerRepository(rolls);
      const forumRepo = new MockForumRepository(
        [{ campaignId: 10, userId: 1 }],
        [{ campaignId: 10, userId: 2 }]
      ) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo);

      const result = await queries.getCampaignDiceRolls(10, 1);
      assert.equal(result.length, 3);
      assert.deepEqual(result.map((r) => r.id), [1, 2, 3]);
    });

    it('retourne UNIQUEMENT ses propres jets de dés si l’utilisateur est un joueur', async () => {
      const campaignRepo = new MockCampaignRepository([campaign1]);
      const dicerRepo = new MockDicerRepository(rolls);
      const forumRepo = new MockForumRepository(
        [{ campaignId: 10, userId: 1 }],
        [
          { campaignId: 10, userId: 2 },
          { campaignId: 10, userId: 3 },
        ]
      ) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo);

      const resultUser2 = await queries.getCampaignDiceRolls(10, 2);
      assert.equal(resultUser2.length, 1);
      assert.equal(resultUser2[0].id, 2);
      assert.equal(resultUser2[0].userId, 2);
      assert.equal(resultUser2[0].description, 'Attaque Joueur 1');

      const resultUser3 = await queries.getCampaignDiceRolls(10, 3);
      assert.equal(resultUser3.length, 1);
      assert.equal(resultUser3[0].id, 3);
      assert.equal(resultUser3[0].userId, 3);
      assert.equal(resultUser3[0].description, 'Chance Joueur 2');
    });
  });

  describe('searchCampaign', () => {
    const campaign: CampaignSummary = {
      id: 5,
      name: 'Campagne de Quête',
      mjId: 1,
      mjUsername: 'mj_user',
      nbJoueurs: 4,
      nbJoueursActuel: 2,
      banniere: '',
      systeme: 'D&D 5',
      univers: 'Fantasy',
      description: 'Test',
      statut: 0,
      isArchived: false,
      isRecrutementOpen: true,
    };

    const topics = [
      { id: 101, campaignId: 5, sectionId: 1, sectionTitle: 'Général', title: 'Règles du jeu', isPrivate: 0 },
      { id: 102, campaignId: 5, sectionId: 1, sectionTitle: 'Général', title: 'Discussion secrète', isPrivate: 1, canReadUserIds: [2] },
      { id: 103, campaignId: 5, sectionId: 2, sectionTitle: 'Quêtes', title: 'La forêt maudite', isPrivate: 0 },
    ];

    const cartes = [
      { id: 201, campagneId: 5, name: 'Carte du Royaume', description: 'Vue globale', image: 'carte1.png', published: true },
      { id: 202, campagneId: 5, name: 'Carte Secrète du Donjon', description: 'MJ Only', image: 'carte2.png', published: false },
    ];

    const characters: RawCampaignCharacterRow[] = [
      {
        id: 301,
        userId: 2,
        userName: 'joueur1',
        userAvatar: null,
        userProfil: 1,
        campagneId: 5,
        name: 'Aragorn',
        concept: 'Rôdeur',
        avatar: 'aragorn.png',
        publicDescription: 'Héros',
        privateDescription: '',
        technical: '',
        statut: 1,
        catId: null,
        categoryName: null,
        persoFields: null,
        widgets: null,
      },
      {
        id: 302,
        userId: null,
        userName: null,
        userAvatar: null,
        userProfil: null,
        campagneId: 5,
        name: 'Aubergiste',
        concept: 'PNJ Tavernier',
        avatar: 'aubergiste.png',
        publicDescription: 'Tavernier',
        privateDescription: '',
        technical: '',
        statut: 1,
        catId: 10,
        categoryName: 'PNJ Ville',
        persoFields: null,
        widgets: null,
      },
    ];

    it('lève CampaignNotFoundError si la campagne n’existe pas', async () => {
      const campaignRepo = new MockCampaignRepository();
      const dicerRepo = new MockDicerRepository();
      const forumRepo = new MockForumRepository() as any;
      const carteRepo = new MockCarteRepository() as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo, carteRepo);

      await assert.rejects(() => queries.searchCampaign(999, 'test', 1), CampaignNotFoundError);
    });

    it('retourne tous les éléments accessibles pour le MJ (y compris les cartes non publiées et topics privés)', async () => {
      const campaignRepo = new MockCampaignRepository([campaign], [], [], characters);
      const dicerRepo = new MockDicerRepository();
      const forumRepo = new MockForumRepository([{ campaignId: 5, userId: 1 }], [], topics) as any;
      const carteRepo = new MockCarteRepository(cartes) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo, carteRepo);

      const result = await queries.searchCampaign(5, '', 1);

      assert.equal(result.topics.length, 3);
      assert.equal(result.cartes.length, 2);
      assert.equal(result.characters.length, 2);
    });

    it('filtre les éléments pour un joueur (ne voit pas les cartes non publiées ni les topics privés non autorisés)', async () => {
      const campaignRepo = new MockCampaignRepository([campaign], [], [], characters);
      const dicerRepo = new MockDicerRepository();
      const forumRepo = new MockForumRepository([], [{ campaignId: 5, userId: 2 }], topics) as any;
      const carteRepo = new MockCarteRepository(cartes) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo, carteRepo);

      // Utilisateur 2 a accès au topic 102 car il est dans canReadUserIds
      const resultUser2 = await queries.searchCampaign(5, '', 2);
      assert.equal(resultUser2.topics.length, 3); // 101, 102 (autorisé), 103
      assert.equal(resultUser2.cartes.length, 1); // seulement 201 (published)
      assert.equal(resultUser2.characters.length, 2);

      // Utilisateur 3 (sans droit sur le topic privé)
      const forumRepo3 = new MockForumRepository([], [{ campaignId: 5, userId: 3 }], topics) as any;
      const queries3 = new CampaignQueries(campaignRepo, dicerRepo, forumRepo3, carteRepo);
      const resultUser3 = await queries3.searchCampaign(5, '', 3);
      assert.equal(resultUser3.topics.length, 2); // 101, 103 (pas 102)
      assert.equal(resultUser3.cartes.length, 1); // seulement 201
    });

    it('filtre par mot-clé dans le nom / titre', async () => {
      const campaignRepo = new MockCampaignRepository([campaign], [], [], characters);
      const dicerRepo = new MockDicerRepository();
      const forumRepo = new MockForumRepository([{ campaignId: 5, userId: 1 }], [], topics) as any;
      const carteRepo = new MockCarteRepository(cartes) as any;
      const queries = new CampaignQueries(campaignRepo, dicerRepo, forumRepo, carteRepo);

      const result = await queries.searchCampaign(5, 'forêt', 1);
      assert.equal(result.topics.length, 1);
      assert.equal(result.topics[0].title, 'La forêt maudite');
      assert.equal(result.cartes.length, 0);
      assert.equal(result.characters.length, 0);

      const resultChar = await queries.searchCampaign(5, 'Aragorn', 1);
      assert.equal(resultChar.characters.length, 1);
      assert.equal(resultChar.characters[0].name, 'Aragorn');
    });
  });
});
