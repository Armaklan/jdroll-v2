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
import { IImageDownloader, buildInlineImageFilename } from '../files/image-downloader.js';

const INLINE_PORTRAIT_URL = 'http://www.espritjdr.net/Upload/campagnes/35/portrait.png';
const INLINE_SCENE_URL = 'http://www.espritjdr.net/Upload/campagnes/35/scene.jpg';
const INLINE_FOREIGN_URL = 'https://exemple.com/pixel.png';

function inlineTarget(url: string, campaignId = 1002): string {
  return `/files/${campaignId}/${buildInlineImageFilename(url)}`;
}
import {
  SourceCampaign,
  SourceEspace,
  SourceSection,
  SourceGroupe,
  SourceTheme,
  SourcePost,
  SourceIntervenant,
  SourceHjPost,
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

const INTERVENANTS: SourceIntervenant[] = [
  {
    id: 50,
    nom: 'H&eacute;ra&iuml;s Abayancehill',
    descriptionPublique: `<p>Description publique <img src="${INLINE_PORTRAIT_URL}"></p>`,
    descriptionPrivee: '<p>Description priv&eacute;e</p>',
    image: 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/50/sanstitrego.png',
  },
  {
    id: 68,
    nom: 'Jeremy Elgmoore',
    descriptionPublique: null,
    descriptionPrivee: null,
    image: null,
  },
];

const POSTS: Record<number, SourcePost[]> = {
  59028: [{ id: 1, themeId: 59028, intervenantId: 68, contenu: '<p>Bonjour</p>', dateCreation: '2022-05-26 15:33:01' }],
  59030: [
    {
      id: 2,
      themeId: 59030,
      intervenantId: 50,
      contenu: `<p>Post 1</p><p><img src="${INLINE_SCENE_URL}"></p>`,
      dateCreation: '2022-05-26 19:26:21',
    },
    {
      id: 3,
      themeId: 59030,
      intervenantId: 43,
      // Intervenant 43 = MJ : non importé comme PNJ, post sans perso
      // Image hors espritjdr.net : lien inchangé
      contenu: `<p>Post 2 <img src="${INLINE_FOREIGN_URL}"></p>`,
      dateCreation: '2022-05-26 19:27:06',
    },
  ],
};

const HJ_POSTS: Record<number, SourceHjPost[]> = {
  59030: [
    {
      id: 10,
      postThemeId: 2,
      intervenantFromId: 50,
      intervenantFromNom: 'H&eacute;ra&iuml;s Abayancehill',
      contenu: '<p>Question HJ sur la sc&egrave;ne</p>',
      dateCreation: '2022-05-26 19:30:00',
      reponses: [
        {
          id: 100,
          hjPostId: 10,
          intervenantId: 43,
          intervenantNom: 'Maitre du Jeu',
          contenu: 'R&eacute;ponse du MJ',
          dateCreation: '2022-05-26 20:00:00',
        },
      ],
    },
    {
      id: 11,
      postThemeId: 3,
      intervenantFromId: 68,
      intervenantFromNom: 'Jeremy Elgmoore',
      contenu: 'Question sans r&eacute;ponse',
      dateCreation: '2022-05-26 21:00:00',
      reponses: [],
    },
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

  async getIntervenantsByCampaign(): Promise<SourceIntervenant[]> {
    return INTERVENANTS;
  }

  async getPostsByTheme(themeId: number): Promise<SourcePost[]> {
    return POSTS[themeId] ?? [];
  }

  async getHjPostsByTheme(themeId: number): Promise<SourceHjPost[]> {
    return HJ_POSTS[themeId] ?? [];
  }

  async getPostIdsByCampaign(): Promise<number[]> {
    return Object.values(POSTS).flat().map((post) => post.id);
  }
}

class InMemoryTarget implements IJdrollTarget {
  nextId = 1000;
  existingUserId: number | null = null;
  campaignMapping: Map<string, number> = new Map();
  sectionMappings: Map<string, number> = new Map();
  topicMappings: Map<string, number> = new Map();
  postMappings: Map<string, number> = new Map();
  pnjMappings: Map<string, number> = new Map();

  createdUsernames: string[] = [];
  createdCampaigns: any[] = [];
  createdSections: any[] = [];
  createdTopics: any[] = [];
  createdPnjs: any[] = [];
  createdPosts: any[] = [];
  deletedMigrations: { targetCampaignId: number; sourceKeys: string[] }[] = [];

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
      : sourceTable === 'intervenant' ? this.pnjMappings
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

  async createPnjWithMapping(sourceKey: string, data: any): Promise<number> {
    const id = this.id();
    this.createdPnjs.push({ sourceKey, data });
    this.pnjMappings.set(sourceKey, id);
    return id;
  }

  async deleteCampaignMigration(targetCampaignId: number, sourceKeys: string[]): Promise<void> {
    this.deletedMigrations.push({ targetCampaignId, sourceKeys });
    for (const key of sourceKeys) {
      this.campaignMapping.delete(key);
      this.sectionMappings.delete(key);
      this.topicMappings.delete(key);
      this.postMappings.delete(key);
      this.pnjMappings.delete(key);
    }
  }

  async createPostsWithMapping(topicSourceKey: string, topicId: number, posts: any[]): Promise<void> {
    for (const post of posts) {
      const id = this.id();
      this.createdPosts.push({ topicId, post });
      this.postMappings.set(`post:${post.sourceId}`, id);
    }
  }
}

class FakeImageDownloader implements IImageDownloader {
  calls: { campaignId: number; filename: string; sourceUrl: string }[] = [];
  deletedFileCampaignIds: number[] = [];
  fail: boolean = false;

  async downloadToCampaign(
    campaignId: number,
    filename: string,
    sourceUrl: string
  ): Promise<string | null> {
    this.calls.push({ campaignId, filename, sourceUrl });
    return this.fail ? null : `/files/${campaignId}/${filename}`;
  }

  async deleteCampaignFiles(campaignId: number): Promise<void> {
    this.deletedFileCampaignIds.push(campaignId);
  }
}

function buildUseCase(
  source: IEspritJdrSource,
  target: IJdrollTarget,
  downloader: IImageDownloader = new FakeImageDownloader(),
  force: boolean = false
): MigrateCampaignUseCase {
  return new MigrateCampaignUseCase(source, target, {
    userName: 'EspritJDR',
    userMail: 'espritjdr@migration.local',
    force,
  }, downloader);
}

test('migrate une campagne complète : utilisateur technique, campagne, sections, topics, posts', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();
  const useCase = buildUseCase(source, target, downloader);

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

  // PNJ : intervenants type 3 et 4 importés comme personnages sans utilisateur,
  // avatar de l'intervenant téléchargé dans files/ et référencé par url relative
  assert.deepEqual(
    target.createdPnjs.map((p: any) => p.sourceKey),
    ['intervenant:50', 'intervenant:68']
  );
  assert.deepEqual(
    target.createdPnjs.map((p: any) => p.data.name),
    ['Héraïs Abayancehill', 'Jeremy Elgmoore']
  );
  assert.equal(target.createdPnjs[0].data.campagneId, 1002);
  assert.equal(target.createdPnjs[0].data.avatar, '/files/1002/pnj-50.png');
  assert.equal(target.createdPnjs[1].data.avatar, '');
  // Image inline de la description publique téléchargée et lien réécrit
  assert.equal(
    target.createdPnjs[0].data.publicDescription,
    `<p>Description publique <img src="${inlineTarget(INLINE_PORTRAIT_URL)}"></p>`
  );
  assert.equal(target.createdPnjs[0].data.privateDescription, '<p>Description priv&eacute;e</p>');
  assert.equal(target.createdPnjs[1].data.publicDescription, '');
  assert.equal(target.createdPnjs[1].data.privateDescription, '');
  assert.deepEqual(downloader.calls, [
    {
      campaignId: 1002,
      filename: 'pnj-50.png',
      sourceUrl: 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/50/sanstitrego.png',
    },
    {
      campaignId: 1002,
      filename: buildInlineImageFilename(INLINE_PORTRAIT_URL),
      sourceUrl: INLINE_PORTRAIT_URL,
    },
    {
      campaignId: 1002,
      filename: buildInlineImageFilename(INLINE_SCENE_URL),
      sourceUrl: INLINE_SCENE_URL,
    },
  ]);

  // Posts : tous migrés vers le topic correspondant, auteur = utilisateur technique,
  // perso = PNJ correspondant à l'intervenant d'origine (null si non importé)
  assert.equal(target.createdPosts.length, 3);
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.userId),
    [1001, 1001, 1001]
  );
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.persoId),
    [1004, 1003, null]
  );
  // Images inline : lien espritjdr.net réécrit vers files/, lien externe inchangé
  assert.equal(
    target.createdPosts[0].post.content,
    '<p>Bonjour</p>'
  );
  // HJ : le post principal reçoit le HJ et ses réponses dans un bloc
  // [private=nom de l'intervenant auteur du HJ]
  assert.equal(
    target.createdPosts[1].post.content,
    `<p>Post 1</p><p><img src="${inlineTarget(INLINE_SCENE_URL)}"></p>\n` +
      '[private=Héraïs Abayancehill]\n' +
      '<p>Question HJ sur la sc&egrave;ne</p>\n' +
      '<p><strong>Maitre du Jeu :</strong> R&eacute;ponse du MJ</p>\n' +
      '[/private]'
  );
  assert.equal(
    target.createdPosts[2].post.content,
    `<p>Post 2 <img src="${INLINE_FOREIGN_URL}"></p>\n` +
      '[private=Jeremy Elgmoore]\n' +
      'Question sans r&eacute;ponse\n' +
      '[/private]'
  );
  assert.equal(target.createdPosts[1].post.createDate, '2022-05-26 19:26:21');

  assert.deepEqual(report, {
    sourceCampaignId: 1356,
    targetCampaignId: 1002,
    ownerUserId: 1001,
    sections: 2,
    topics: 2,
    pnjs: 2,
    images: 3,
    posts: 3,
    hjPosts: 2,
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

test('reprend une migration interrompue : topics, PNJ et posts déjà migrés sont ignorés', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  // La campagne a déjà été migrée partiellement : on réinitialise le mapping campagne
  // pour simuler une reprise après échec.
  // Topic 59028 déjà créé (id 300), post 1 déjà migré, PNJ de l'intervenant 50 déjà créé (id 777).
  target.topicMappings.set('theme:59028', 300);
  target.postMappings.set('post:1', 9001);
  target.pnjMappings.set('intervenant:50', 777);

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

  // PNJ déjà migré : pas de recréation, seul l'intervenant 68 est créé
  assert.deepEqual(
    target.createdPnjs.map((p: any) => p.sourceKey),
    ['intervenant:68']
  );
  assert.equal(report.pnjs, 1);

  // Posts du topic 59028 : le post 1 déjà migré est sauté, aucun appel avec lui
  const postIds = target.createdPosts.map((p: any) => p.post);
  assert.equal(target.createdPosts.length, 2); // posts 2 et 3 du thème 59030
  // Le post 2 (intervenant 50) est lié au PNJ déjà existant
  assert.equal(target.createdPosts[0].post.persoId, 777);
  assert.equal(report.skippedPosts, 1);
  assert.equal(report.posts, 2);
});

test('force : supprime puis réimporte intégralement une campagne déjà migrée', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();
  // Campagne déjà migrée (id jdroll 555), partiellement : un topic, un post et un PNJ
  target.campaignMapping.set('campagne:1356', 555);
  target.topicMappings.set('theme:59028', 300);
  target.postMappings.set('post:1', 9001);
  target.pnjMappings.set('intervenant:50', 777);

  const report = await buildUseCase(source, target, downloader, true).execute(1356);

  // Suppression demandée avec toutes les clés source de la campagne
  assert.equal(target.deletedMigrations.length, 1);
  assert.equal(target.deletedMigrations[0].targetCampaignId, 555);
  assert.deepEqual(target.deletedMigrations[0].sourceKeys, [
    'campagne:1356',
    'espace:4652',
    'espace:4653:section:10746',
    'theme:59028',
    'theme:59030',
    'intervenant:50',
    'intervenant:68',
    'post:1',
    'post:2',
    'post:3',
  ]);
  // Fichiers téléchargés de l'ancienne campagne supprimés
  assert.deepEqual(downloader.deletedFileCampaignIds, [555]);

  // Réimport complet : plus rien n'est considéré comme déjà migré
  assert.equal(report.targetCampaignId, 1002);
  assert.equal(report.pnjs, 2);
  assert.equal(report.images, 3);
  assert.equal(report.posts, 3);
  assert.equal(report.skippedPosts, 0);
  assert.equal(target.createdPnjs.length, 2);
  assert.equal(target.createdTopics.length, 2);
  assert.equal(target.createdPosts.length, 3);
});

test('force sans migration préalable n\'efface rien', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();

  const report = await buildUseCase(source, target, downloader, true).execute(1356);

  assert.equal(target.deletedMigrations.length, 0);
  assert.deepEqual(downloader.deletedFileCampaignIds, []);
  assert.equal(report.posts, 3);
  assert.equal(report.targetCampaignId, 1002);
});

test('laisse les liens d\'origine si le téléchargement des images échoue', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();
  downloader.fail = true;

  const report = await buildUseCase(source, target, downloader).execute(1356);

  assert.equal(target.createdPnjs.length, 2);
  assert.equal(target.createdPnjs[0].data.avatar, '');
  assert.equal(
    target.createdPnjs[0].data.publicDescription,
    `<p>Description publique <img src="${INLINE_PORTRAIT_URL}"></p>`
  );
  assert.equal(
    target.createdPosts[1].post.content,
    `<p>Post 1</p><p><img src="${INLINE_SCENE_URL}"></p>\n` +
      '[private=Héraïs Abayancehill]\n' +
      '<p>Question HJ sur la sc&egrave;ne</p>\n' +
      '<p><strong>Maitre du Jeu :</strong> R&eacute;ponse du MJ</p>\n' +
      '[/private]'
  );
  assert.equal(report.pnjs, 2);
  assert.equal(report.images, 0);
});
