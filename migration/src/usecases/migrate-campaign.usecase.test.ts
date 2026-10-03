import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MigrateCampaignUseCase } from './migrate-campaign.usecase.js';
import {
  CampaignNotFoundError,
  CampaignAlreadyMigratedError,
} from '../errors/migration.errors.js';
import {
  IEspritJdrSource,
  IJdrollTarget,
} from '../repositories/index.js';
import {
  SourceCampaign,
  SourceEspace,
  SourceSection,
  SourceGroupe,
  SourceTheme,
  SourcePost,
} from '../types.js';

const CAMPAIGN: SourceCampaign = {
  id: 1356,
  nom: 'Agartha&nbsp;: l\'Odyss&eacute;e',
  jeuNom: 'Pathfinder 2',
  annonce: '<p>Une aventure &eacute;pique</p>',
  statutCampagneId: 2,
  inscriptionPJ: true,
  nbMaxJoueur: 4,
};

const ESPACES: SourceEspace[] = [
  { id: 4652, campagneId: 1356, libelle: 'Discussions libres', type: 2, ordre: 4652 },
  { id: 4653, campagneId: 1356, libelle: 'Contexte et R&egrave;gles', type: 3, ordre: 4653 },
];

const SECTIONS: SourceSection[] = [
  { id: 10746, espaceId: 4653, libelle: 'Secondaire', ordre: 1 },
];

const GROUPES: SourceGroupe[] = [
  { id: 24652, campagneId: 1356, titre: 'Accueil', espaceId: 4652, sectionId: null, statutGroupeId: 1, ordre: 1 },
  { id: 24653, campagneId: 1356, titre: 'Principale', espaceId: 4653, sectionId: 10746, statutGroupeId: 2, ordre: 2 },
];

const THEMES: SourceTheme[] = [
  { id: 59028, groupeId: 24652, titre: 'Hors jeu', statutThemeId: 1, ordre: 1 },
  { id: 59030, groupeId: 24653, titre: 'Episode 1', statutThemeId: 1, ordre: 1 },
];

const POSTS: Record<number, SourcePost[]> = {
  59028: [{ id: 1, themeId: 59028, contenu: '<p>Bonjour</p>', dateCreation: '2022-05-26 15:33:01' }],
  59030: [
    { id: 2, themeId: 59030, contenu: '<p>Post 1</p>', dateCreation: '2022-05-26 19:26:21' },
    { id: 3, themeId: 59030, contenu: '<p>Post 2</p>', dateCreation: '2022-05-26 19:27:06' },
  ],
};

class InMemorySource implements IEspritJdrSource {
  campaign: SourceCampaign | null = CAMPAIGN;

  async getCampaign(campaignId: number): Promise<SourceCampaign | null> {
    return this.campaign && this.campaign.id === campaignId ? this.campaign : null;
  }

  async getEspaces(): Promise<SourceEspace[]> {
    return ESPACES;
  }

  async getSections(): Promise<SourceSection[]> {
    return SECTIONS;
  }

  async getGroupes(): Promise<SourceGroupe[]> {
    return GROUPES;
  }

  async getThemes(): Promise<SourceTheme[]> {
    return THEMES;
  }

  async getPostsByTheme(themeId: number): Promise<SourcePost[]> {
    return POSTS[themeId] ?? [];
  }
}

class InMemoryTarget implements IJdrollTarget {
  nextId = 1000;
  existingUserId: number | null = null;
  campaignMapping: Map<string, number> = new Map();
  sectionMappings: Map<string, number> = new Map();
  topicMappings: Map<string, number> = new Map();
  postMappings: Map<string, number> = new Map();

  createdUsernames: string[] = [];
  createdCampaigns: any[] = [];
  createdSections: any[] = [];
  createdTopics: any[] = [];
  createdPosts: any[] = [];

  id(): number {
    this.nextId += 1;
    return this.nextId;
  }

  async ensureMigrationTable(): Promise<void> {}

  async findUserIdByUsername(username: string): Promise<number | null> {
    return this.existingUserId !== null && this.createdUsernames.includes(username)
      ? this.existingUserId
      : null;
  }

  async createUser(data: { username: string; mail: string; passwordHash: string; description: string }): Promise<number> {
    this.createdUsernames.push(data.username);
    return this.id();
  }

  async getMigrationTargetId(sourceTable: string, sourceKey: string): Promise<number | null> {
    const map =
      sourceTable === 'campagne' ? this.campaignMapping
      : sourceTable === 'section' ? this.sectionMappings
      : sourceTable === 'topic' ? this.topicMappings
      : this.postMappings;
    return map.get(sourceKey) ?? null;
  }

  async getMigrationTargetIds(sourceTable: string, sourceKeys: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const key of sourceKeys) {
      const id = await this.getMigrationTargetId(sourceTable, key);
      if (id !== null) {
        result.set(key, id);
      }
    }
    return result;
  }

  async createCampaignWithMapping(sourceKey: string, data: any): Promise<number> {
    const id = this.id();
    this.createdCampaigns.push({ sourceKey, data });
    this.campaignMapping.set(sourceKey, id);
    return id;
  }

  async createSectionWithMapping(sourceKey: string, data: any): Promise<number> {
    const id = this.id();
    this.createdSections.push({ sourceKey, data });
    this.sectionMappings.set(sourceKey, id);
    return id;
  }

  async createTopicWithMapping(sourceKey: string, data: any): Promise<number> {
    const id = this.id();
    this.createdTopics.push({ sourceKey, data });
    this.topicMappings.set(sourceKey, id);
    return id;
  }

  async createPostsWithMapping(topicSourceKey: string, topicId: number, posts: any[]): Promise<void> {
    for (const post of posts) {
      const id = this.id();
      this.createdPosts.push({ topicId, post });
      this.postMappings.set(`post:${post.sourceId}`, id);
    }
  }
}

function buildUseCase(source: IEspritJdrSource, target: IJdrollTarget): MigrateCampaignUseCase {
  return new MigrateCampaignUseCase(source, target, {
    userName: 'EspritJDR',
    userMail: 'espritjdr@migration.local',
  });
}

test('migrate une campagne complète : utilisateur technique, campagne, sections, topics, posts', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const useCase = buildUseCase(source, target);

  const report = await useCase.execute(1356);

  // Utilisateur technique créé puis utilisé comme MJ
  assert.deepEqual(target.createdUsernames, ['EspritJDR']);
  assert.equal(report.ownerUserId, 1001);

  // Campagne créée avec le nom décodé et le mapping campagne:1356
  assert.equal(target.createdCampaigns.length, 1);
  assert.equal(target.createdCampaigns[0].sourceKey, 'campagne:1356');
  assert.equal(target.createdCampaigns[0].data.name, "Agartha : l'Odyssée");
  assert.equal(target.createdCampaigns[0].data.mjId, 1001);
  assert.equal(report.targetCampaignId, 1002);

  // Sections : une par couple espace/intercalaire occupé
  assert.deepEqual(
    target.createdSections.map((s: any) => s.data.title),
    ['Discussions libres', 'Contexte et Règles > Secondaire']
  );

  // Topics : libellés "groupe > thème", topic du groupe fermé marqué fermé
  assert.deepEqual(
    target.createdTopics.map((t: any) => t.data.title),
    ['Accueil > Hors jeu', 'Principale > Episode 1']
  );
  assert.equal(target.createdTopics[1].data.isClosed, true);

  // Posts : tous migrés vers le topic correspondant, auteur = utilisateur technique
  assert.equal(target.createdPosts.length, 3);
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.userId),
    [1001, 1001, 1001]
  );
  assert.equal(target.createdPosts[1].post.createDate, '2022-05-26 19:26:21');

  assert.deepEqual(report, {
    sourceCampaignId: 1356,
    targetCampaignId: 1002,
    ownerUserId: 1001,
    sections: 2,
    topics: 2,
    posts: 3,
    skippedPosts: 0,
  });
});

test('lève CampaignNotFoundError si la campagne source n\'existe pas', async () => {
  const source = new InMemorySource();
  source.campaign = null;
  const target = new InMemoryTarget();

  await assert.rejects(
    () => buildUseCase(source, target).execute(99999),
    CampaignNotFoundError
  );
});

test('lève CampaignAlreadyMigratedError si la campagne a déjà été migrée', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.campaignMapping.set('campagne:1356', 555);

  await assert.rejects(
    () => buildUseCase(source, target).execute(1356),
    (error: unknown) => {
      assert.ok(error instanceof CampaignAlreadyMigratedError);
      assert.equal((error as CampaignAlreadyMigratedError).targetCampaignId, 555);
      return true;
    }
  );
});

test('réutilise l\'utilisateur technique s\'il existe déjà', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.existingUserId = 77;
  target.createdUsernames.push('EspritJDR');

  const report = await buildUseCase(source, target).execute(1356);

  assert.deepEqual(target.createdUsernames, ['EspritJDR']);
  assert.equal(report.ownerUserId, 77);
});

test('reprend une migration interrompue : topics et posts déjà migrés sont ignorés', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  // La campagne a déjà été migrée partiellement : on réinitialise le mapping campagne
  // pour simuler une reprise après échec.
  // Topic 59028 déjà créé (id 300), post 1 déjà migré.
  target.topicMappings.set('theme:59028', 300);
  target.postMappings.set('post:1', 9001);

  const report = await buildUseCase(source, target).execute(1356);

  // Topic déjà migré : pas de recréation
  assert.equal(
    target.createdTopics.filter((t: any) => t.sourceKey === 'theme:59028').length,
    0
  );
  // Topic 59030 créé
  assert.equal(
    target.createdTopics.filter((t: any) => t.sourceKey === 'theme:59030').length,
    1
  );

  // Posts du topic 59028 : le post 1 déjà migré est sauté, aucun appel avec lui
  const postIds = target.createdPosts.map((p: any) => p.post);
  assert.equal(target.createdPosts.length, 2); // posts 2 et 3 du thème 59030
  assert.equal(report.skippedPosts, 1);
  assert.equal(report.posts, 2);
});
