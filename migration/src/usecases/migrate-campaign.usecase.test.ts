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
  SourceMjIntervenant,
  SourceHjPost,
  SourceDiceRequest,
  SourceFiche,
  SourceHabillage,
} from '../types.js';
import { FicheNotFoundError } from '../errors/migration.errors.js';

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
    utilisateurId: 52,
    utilisateurPseudo: 'Armaklan',
  },
  {
    id: 68,
    nom: 'Jeremy Elgmoore',
    descriptionPublique: null,
    descriptionPrivee: null,
    image: null,
    utilisateurId: 5,
    utilisateurPseudo: 'Quincey',
  },
];

const BANDEAU_URL = 'http://www.espritjdr.net/Upload/campagnes/1356/habillage/bandeau.png';

const HABILLAGE: SourceHabillage = {
  campagneId: 1356,
  bandeau: BANDEAU_URL,
};

// Intervenants non importés comme personnages : CREA (type 1) et MJ (type 2)
const MJ_INTERVENANTS: SourceMjIntervenant[] = [
  { id: 43, typeIntervenantId: 1, utilisateurId: 5, utilisateurPseudo: 'Arkeos' },
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

const DICE_REQUESTS: SourceDiceRequest[] = [
  {
    id: 501,
    intervenantFromId: 43,
    intervenantToId: 50,
    typeJet: 'PJ',
    jetSecret: false,
    nom: 'H&eacute;ra&iuml;s Abayancehill',
    jets: ['11|0|D10|Perception|7|0|2|-1|0|9'],
    etat: 3,
    nbjet: 1,
    title: 'Jet pour H&eacute;ra&iuml;s Abayancehill (Perception) / 9 att  bonus ( 0)',
    resultat:
      'Demande de jet de d&eacute;s de H&eacute;ra&iuml;s Abayancehill : <br \\>' +
      'Jet de Perception : 9 => (  <img src=\'http://www.espritjdr.net/images/des/D10/d10_bleu_2.png\' width=\'40\' alt=\'\' />) + 7<br />',
    campagneId: 1356,
    postThemeId: 2,
  },
  {
    id: 502,
    intervenantFromId: 43,
    intervenantToId: 68,
    typeJet: 'PJ',
    jetSecret: true,
    nom: 'Jeremy Elgmoore',
    jets: ['7|0|D6|Esprit-Ame|5||0|0|0|0'],
    etat: 1,
    nbjet: 1,
    title: 'Jet secret pour Jeremy Elgmoore (Esprit-Ame) bonus ( 0)',
    resultat: null,
    campagneId: 1356,
    postThemeId: 3,
  },
  {
    id: 503,
    intervenantFromId: 43,
    intervenantToId: 50,
    typeJet: 'PJ',
    jetSecret: false,
    nom: 'H&eacute;ra&iuml;s Abayancehill',
    jets: ['0|0|D6|3'],
    etat: 3,
    nbjet: 1,
    title: 'Jet pour H&eacute;ra&iuml;s Abayancehill (g&eacute;n&eacute;rique : 3 D6)',
    resultat: null,
    campagneId: 1356,
    postThemeId: null,
  },
];

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
  intervenants: SourceIntervenant[] = INTERVENANTS;
  mjIntervenants: SourceMjIntervenant[] = MJ_INTERVENANTS;
  diceRequests: SourceDiceRequest[] = DICE_REQUESTS;
  fiche: SourceFiche | null = null;
  habillage: SourceHabillage | null = HABILLAGE;

  async getFiche(ficheId: number): Promise<SourceFiche | null> {
    return this.fiche && this.fiche.id === ficheId ? this.fiche : null;
  }

  async getHabillageByCampaign(): Promise<SourceHabillage | null> {
    return this.habillage;
  }

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
    return this.intervenants;
  }

  async getMjIntervenantsByCampaign(): Promise<SourceMjIntervenant[]> {
    return this.mjIntervenants;
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

  async getDiceRequestsByCampaign(): Promise<SourceDiceRequest[]> {
    return this.diceRequests;
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
  diceRollMappings: Map<string, number> = new Map();
  dicePostMappings: Map<string, number> = new Map();
  ficheMappings: Map<string, number> = new Map();

  createdUsernames: string[] = [];
  createdCampaigns: any[] = [];
  createdSections: any[] = [];
  createdTopics: any[] = [];
  createdPnjs: any[] = [];
  createdPosts: any[] = [];
  createdDiceRolls: any[] = [];
  appliedSheets: { sourceKey: string; campagneId: number; data: any }[] = [];
  appliedBanners: { campaignId: number; bannerUrl: string }[] = [];
  deletedMigrations: { targetCampaignId: number; sourceKeys: string[] }[] = [];

  // Utilisateurs jdroll préexistants (pseudo -> id)
  knownUsers: Record<string, number> = {};
  participants: { campaignId: number; userId: number; statut: number }[] = [];
  attachedPersos: { persoId: number; userId: number }[] = [];
  updatedMjs: { campaignId: number; mjId: number }[] = [];

  id(): number {
    this.nextId += 1;
    return this.nextId;
  }

  async ensureMigrationTable(): Promise<void> {}

  async findUserIdByUsername(username: string): Promise<number | null> {
    if (username in this.knownUsers) {
      return this.knownUsers[username];
    }
    return this.existingUserId !== null && this.createdUsernames.includes(username)
      ? this.existingUserId
      : null;
  }

  async addCampaignParticipant(campaignId: number, userId: number, statut: number): Promise<void> {
    this.participants.push({ campaignId, userId, statut });
  }

  async setCampaignMj(campaignId: number, mjId: number): Promise<void> {
    this.updatedMjs.push({ campaignId, mjId });
  }

  async attachPersoToUser(persoId: number, userId: number): Promise<void> {
    this.attachedPersos.push({ persoId, userId });
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
      : sourceTable === 'generateur_fiche' ? this.ficheMappings
      : sourceTable === 'demande_jet'
        ? sourceKey.startsWith('demande_jet_post:')
          ? this.dicePostMappings
          : this.diceRollMappings
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
      this.diceRollMappings.delete(key);
      this.dicePostMappings.delete(key);
      this.ficheMappings.delete(key);
    }
  }

  async applyCampaignSheet(sourceKey: string, campagneId: number, data: any): Promise<void> {
    this.appliedSheets.push({ sourceKey, campagneId, data });
    this.ficheMappings.set(sourceKey, campagneId);
  }

  async setCampaignBanner(campaignId: number, bannerUrl: string): Promise<void> {
    this.appliedBanners.push({ campaignId, bannerUrl });
  }

  async createPostsWithMapping(topicId: number, items: any[]): Promise<void> {
    for (const item of items) {
      const id = this.id();
      this.createdPosts.push({ topicId, post: item });
      if (item.mappingKey.startsWith('demande_jet_post:')) {
        this.dicePostMappings.set(item.mappingKey, id);
      } else {
        this.postMappings.set(item.mappingKey, id);
      }
    }
  }

  async createDiceRollsWithMapping(rolls: any[]): Promise<void> {
    for (const roll of rolls) {
      const id = this.id();
      this.createdDiceRolls.push(roll);
      this.diceRollMappings.set(`demande_jet:${roll.sourceId}`, id);
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
  force: boolean = false,
  noImages: boolean = false,
  ficheId: number | null = null
): MigrateCampaignUseCase {
  return new MigrateCampaignUseCase(source, target, {
    userName: 'EspritJDR',
    userMail: 'espritjdr@migration.local',
    force,
    noImages,
    ficheId,
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

  // Sections : une par groupe portant des thèmes, libellés
  // "espace > intercalaire > groupe" (intercalaire omis si absent)
  assert.deepEqual(
    target.createdSections.map((s: any) => s.data.title),
    ['Discussions libres > Accueil', 'Contexte et Règles > Secondaire > Principale']
  );

  // Topics : libellés du seul thème, topic du groupe fermé marqué fermé
  assert.deepEqual(
    target.createdTopics.map((t: any) => t.data.title),
    ['Hors jeu', 'Episode 1']
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

  // Bannière habillage : téléchargée une seule fois puis appliquée à la
  // campagne (campagne.banniere et campagne_config.banniere)
  assert.deepEqual(target.appliedBanners, [
    {
      campaignId: 1002,
      bannerUrl: `/files/1002/${buildInlineImageFilename(BANDEAU_URL)}`,
    },
  ]);
  assert.deepEqual(downloader.calls, [
    {
      campaignId: 1002,
      filename: buildInlineImageFilename(BANDEAU_URL),
      sourceUrl: BANDEAU_URL,
    },
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
  // perso = PNJ correspondant à l'intervenant d'origine (null si non importé).
  // Les posts de jet de dés sont intercalés juste après le post lié.
  assert.equal(target.createdPosts.length, 5);
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.mappingKey),
    ['post:1', 'post:2', 'demande_jet_post:501', 'post:3', 'demande_jet_post:502']
  );
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.userId),
    [1001, 1001, null, 1001, null]
  );
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.persoId),
    [1004, 1003, null, null, null]
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
    target.createdPosts[3].post.content,
    `<p>Post 2 <img src="${INLINE_FOREIGN_URL}"></p>\n` +
      '[private=Jeremy Elgmoore]\n' +
      'Question sans r&eacute;ponse\n' +
      '[/private]'
  );
  assert.equal(target.createdPosts[1].post.createDate, '2022-05-26 19:26:21');

  // Posts de jet de dés : même carte que les jets du site, sans auteur ni perso,
  // datés du post lié, dans le topic du post lié
  const dicePost501 = target.createdPosts[2];
  // Topic du post lié (post 2, thème 59030 -> topic créé après sections et post 1)
  assert.equal(dicePost501.topicId, 1009);
  assert.equal(target.createdPosts[4].topicId, 1009);
  assert.equal(dicePost501.post.createDate, '2022-05-26 19:26:21');
  assert.ok(
    dicePost501.post.content.includes(
      'Jet pour Héraïs Abayancehill (Perception) / 9 att  bonus ( 0)'
    )
  );
  assert.ok(dicePost501.post.content.includes('Jet de Perception : 9 =&gt; (  d10 ( 2 )) + 7'));
  assert.ok(target.createdPosts[4].post.content.includes('Jet demandé, sans résultat enregistré.'));

  // Jets de dés : une ligne dicer par demande_jet, mappée demande_jet:<id>
  assert.deepEqual(
    target.createdDiceRolls,
    [
      {
        sourceId: 501,
        userId: 1001,
        campagneId: 1002,
        createDate: '2022-05-26 19:26:21',
        result: 'Jet de Perception : 9 =&gt; (  d10 ( 2 )) + 7',
        description: 'Jet pour Héraïs Abayancehill (Perception) / 9 att  bonus ( 0)',
      },
      {
        sourceId: 502,
        userId: 1001,
        campagneId: 1002,
        createDate: '2022-05-26 19:27:06',
        result: '',
        description: 'Jet secret pour Jeremy Elgmoore (Esprit-Ame) bonus ( 0)',
      },
      {
        sourceId: 503,
        userId: 1001,
        campagneId: 1002,
        createDate: null,
        result: '',
        description: 'Jet pour Héraïs Abayancehill (générique : 3 D6)',
      },
    ]
  );

  assert.deepEqual(report, {
    sourceCampaignId: 1356,
    targetCampaignId: 1002,
    ownerUserId: 1001,
    mjUserId: 1001,
    sections: 2,
    topics: 2,
    pnjs: 2,
    images: 4,
    posts: 3,
    diceRolls: 3,
    dicePosts: 2,
    hjPosts: 2,
    skippedPosts: 0,
    participants: 0,
    assistants: 0,
    sheet: null,
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
  assert.equal(target.createdPosts.length, 4); // posts 2 et 3 + leurs posts de jet de dés
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.mappingKey),
    ['post:2', 'demande_jet_post:501', 'post:3', 'demande_jet_post:502']
  );
  // Le post 2 (intervenant 50) est lié au PNJ déjà existant
  assert.equal(target.createdPosts[0].post.persoId, 777);
  assert.equal(report.skippedPosts, 1);
  assert.equal(report.posts, 2);
  assert.equal(report.diceRolls, 3);
  assert.equal(report.dicePosts, 2);
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
    'espace:4652:groupe:24652',
    'espace:4653:section:10746:groupe:24653',
    'theme:59028',
    'theme:59030',
    'intervenant:50',
    'intervenant:68',
    'post:1',
    'post:2',
    'post:3',
    'demande_jet:501',
    'demande_jet_post:501',
    'demande_jet:502',
    'demande_jet_post:502',
    'demande_jet:503',
  ]);
  // Fichiers téléchargés de l'ancienne campagne supprimés
  assert.deepEqual(downloader.deletedFileCampaignIds, [555]);

  // Réimport complet : plus rien n'est considéré comme déjà migré
  assert.equal(report.targetCampaignId, 1002);
  assert.equal(report.pnjs, 2);
  assert.equal(report.images, 4);
  assert.equal(report.posts, 3);
  assert.equal(report.diceRolls, 3);
  assert.equal(report.dicePosts, 2);
  assert.equal(report.skippedPosts, 0);
  assert.equal(target.createdPnjs.length, 2);
  assert.equal(target.createdTopics.length, 2);
  assert.equal(target.createdPosts.length, 5);
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
  // Bannière : échec du téléchargement, le lien d'origine est conservé
  assert.deepEqual(target.appliedBanners, [
    { campaignId: 1002, bannerUrl: BANDEAU_URL },
  ]);
});

test('rattache un intervenant lié à un utilisateur jdroll connu : participant validé et perso associé', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.knownUsers = { Armaklan: 500 };

  const report = await buildUseCase(source, target).execute(1356);

  // Intervenant 50 (PJ) : utilisateur jdroll du même pseudo ajouté en participant validé
  assert.deepEqual(target.participants, [{ campaignId: 1002, userId: 500, statut: 1 }]);
  // et le personnage migré lui est associé
  assert.deepEqual(target.attachedPersos, [{ persoId: 1003, userId: 500 }]);
  assert.equal(report.participants, 1);
  // Intervenant 68 : pseudo 'Quincey' inconnu, aucun rattachement
  assert.equal(target.participants.filter((p) => p.userId !== 500).length, 0);
  // Le MJ technique reste MJ de la campagne
  assert.deepEqual(target.updatedMjs, []);
  assert.equal(report.mjUserId, 1001);
});

test('reprise : un perso déjà migré reste associé à l\'utilisateur jdroll connu', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.pnjMappings.set('intervenant:50', 777);
  target.knownUsers = { Armaklan: 500 };

  const report = await buildUseCase(source, target).execute(1356);

  assert.deepEqual(target.attachedPersos, [{ persoId: 777, userId: 500 }]);
  assert.deepEqual(target.participants, [{ campaignId: 1002, userId: 500, statut: 1 }]);
  assert.equal(report.participants, 1);
});

test('un post d\'un intervenant rattaché à un utilisateur jdroll connu est attribué à cet utilisateur', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.knownUsers = { Armaklan: 500 };

  await buildUseCase(source, target).execute(1356);

  // Post 1 : intervenant 68 (pseudo 'Quincey' inconnu) -> utilisateur technique
  // Post 2 : intervenant 50 (pseudo 'Armaklan' connu) -> utilisateur jdroll 500
  // Post 3 : intervenant 43 (CREA, non importé) -> utilisateur technique
  // Les posts de jet de dés restent sans auteur (comme sur le site)
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.userId),
    [1001, 500, null, 1001, null]
  );
  // Le perso reste associé au post
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.persoId),
    [1004, 1003, null, null, null]
  );
});

test('le MJ identifié via le CREA n\'est pas inséré participant, même s\'il a des personnages', async () => {
  const source = new InMemorySource();
  // PNJ supplémentaire lié à l'utilisateur du CREA (pseudo 'Arkeos')
  source.intervenants = [
    ...INTERVENANTS,
    {
      id: 70,
      nom: 'PNJ du MJ',
      descriptionPublique: null,
      descriptionPrivee: null,
      image: null,
      utilisateurId: 5,
      utilisateurPseudo: 'Arkeos',
    },
  ];
  const target = new InMemoryTarget();
  target.knownUsers = { Arkeos: 600, Armaklan: 500 };

  const report = await buildUseCase(source, target).execute(1356);

  // Le CREA unique devient MJ de la campagne
  assert.deepEqual(target.updatedMjs, [{ campaignId: 1002, mjId: 600 }]);
  assert.equal(report.mjUserId, 600);
  // Participant uniquement pour le PJ 'Armaklan' : le MJ n'est pas inséré
  assert.deepEqual(target.participants, [{ campaignId: 1002, userId: 500, statut: 1 }]);
  assert.equal(report.participants, 1);
  // Mais le personnage du MJ lui reste associé
  assert.deepEqual(target.attachedPersos, [
    { persoId: 1003, userId: 500 },
    { persoId: 1005, userId: 600 },
  ]);
});

test('un seul intervenant CREA (type 1) lié à un utilisateur connu : la campagne lui est associée', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.knownUsers = { Arkeos: 600 };

  const report = await buildUseCase(source, target).execute(1356);

  assert.deepEqual(target.updatedMjs, [{ campaignId: 1002, mjId: 600 }]);
  assert.equal(report.mjUserId, 600);
});

test('plusieurs intervenants CREA (type 1) : la campagne reste au MJ technique', async () => {
  const source = new InMemorySource();
  source.mjIntervenants = [
    { id: 43, typeIntervenantId: 1, utilisateurId: 5, utilisateurPseudo: 'Arkeos' },
    { id: 44, typeIntervenantId: 1, utilisateurId: 6, utilisateurPseudo: 'DoubleCreame' },
  ];
  const target = new InMemoryTarget();
  target.knownUsers = { Arkeos: 600, DoubleCreame: 601 };

  const report = await buildUseCase(source, target).execute(1356);

  assert.deepEqual(target.updatedMjs, []);
  assert.equal(report.mjUserId, 1001);
});

test('les intervenants MJ (type 2) liés à des utilisateurs connus deviennent MJ assistants', async () => {
  const source = new InMemorySource();
  source.mjIntervenants = [
    { id: 90, typeIntervenantId: 2, utilisateurId: 7, utilisateurPseudo: 'CoMj' },
    { id: 91, typeIntervenantId: 2, utilisateurId: 8, utilisateurPseudo: 'Inconnu' },
  ];
  const target = new InMemoryTarget();
  target.knownUsers = { CoMj: 601 };

  const report = await buildUseCase(source, target).execute(1356);

  assert.deepEqual(target.participants, [{ campaignId: 1002, userId: 601, statut: 2 }]);
  assert.equal(report.assistants, 1);
  assert.equal(report.mjUserId, 1001);
});

test('un utilisateur lié à la fois au CREA (type 1) et à un MJ (type 2) est juste MJ, pas assistant', async () => {
  const source = new InMemorySource();
  source.mjIntervenants = [
    { id: 43, typeIntervenantId: 1, utilisateurId: 5, utilisateurPseudo: 'Arkeos' },
    { id: 90, typeIntervenantId: 2, utilisateurId: 5, utilisateurPseudo: 'Arkeos' },
  ];
  const target = new InMemoryTarget();
  target.knownUsers = { Arkeos: 600 };

  const report = await buildUseCase(source, target).execute(1356);

  // Il devient MJ de la campagne...
  assert.deepEqual(target.updatedMjs, [{ campaignId: 1002, mjId: 600 }]);
  assert.equal(report.mjUserId, 600);
  // ...mais n'est pas inséré dans campagne_participant (ni assistant, ni joueur)
  assert.deepEqual(target.participants, []);
  assert.equal(report.assistants, 0);
});

test('--noimg : aucun téléchargement, les liens d\'origine des images sont conservés', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();

  const report = await buildUseCase(source, target, downloader, false, true).execute(1356);

  // Aucun téléchargement : ni avatar, ni image inline
  assert.deepEqual(downloader.calls, []);
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
  assert.equal(report.images, 0);
  assert.equal(report.pnjs, 2);
  assert.equal(report.posts, 3);
  // Bannière : pas de téléchargement, le lien d'origine est conservé
  assert.deepEqual(target.appliedBanners, [
    { campaignId: 1002, bannerUrl: BANDEAU_URL },
  ]);
});

test('sans habillage : aucune bannière n\'est appliquée', async () => {
  const source = new InMemorySource();
  source.habillage = null;
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();

  const report = await buildUseCase(source, target, downloader).execute(1356);

  assert.deepEqual(target.appliedBanners, []);
  assert.equal(report.images, 3);
});

test('habillage avec un bandeau vide : aucune bannière n\'est appliquée', async () => {
  const source = new InMemorySource();
  source.habillage = { campagneId: 1356, bandeau: '' };
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();

  const report = await buildUseCase(source, target, downloader).execute(1356);

  assert.deepEqual(target.appliedBanners, []);
  assert.equal(report.images, 3);
});

test('reprise : un jet lié à un post déjà migré est posté en fin de topic', async () => {
  const source = new InMemorySource();
  // Une seule demande de jet, liée au post 2 déjà migré
  source.diceRequests = [DICE_REQUESTS[0]];
  const target = new InMemoryTarget();
  target.postMappings.set('post:2', 9001);

  const report = await buildUseCase(source, target).execute(1356);

  // Le post de jet, impossible à intercaler (post lié déjà migré), est posté
  // en fin du topic du post lié, avec la date du post lié
  assert.deepEqual(
    target.createdPosts.map((p: any) => p.post.mappingKey),
    ['post:1', 'post:3', 'demande_jet_post:501']
  );
  assert.equal(target.createdPosts[2].post.createDate, '2022-05-26 19:26:21');
  assert.equal(report.dicePosts, 1);
  assert.equal(report.diceRolls, 1);
});

test('reprise : un jet déjà migré (ligne dicer et post) n\'est pas recréé', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.diceRollMappings.set('demande_jet:501', 8001);
  target.dicePostMappings.set('demande_jet_post:501', 9002);

  const report = await buildUseCase(source, target).execute(1356);

  assert.equal(target.createdDiceRolls.filter((r: any) => r.sourceId === 501).length, 0);
  assert.equal(
    target.createdPosts.filter((p: any) => p.post.mappingKey === 'demande_jet_post:501').length,
    0
  );
  assert.equal(report.diceRolls, 2);
  assert.equal(report.dicePosts, 1);
});

test('la ligne dicer d\'un jet est attribuée au joueur jdroll de l\'intervenant destinataire', async () => {
  const source = new InMemorySource();
  const target = new InMemoryTarget();
  target.knownUsers = { Armaklan: 500 };

  await buildUseCase(source, target).execute(1356);

  // Jet 501 et 503 : intervenant destinataire 50 (pseudo Armaklan) -> 500
  // Jet 502 : intervenant destinataire 68 (pseudo Quincey inconnu) -> technique
  assert.deepEqual(
    target.createdDiceRolls.map((r: any) => r.userId),
    [500, 1001, 500]
  );
});

const FICHE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<fiche id="fiche_generateur" generateur="1" image="http://www.espritjdr.net/Upload/generateur/8/fond.png" txtcouleur="#ffa93d" largeur="850" hauteur="762"><system_jet id="70"/>
<text id="nom_perso" position_haut="14" position_gauche="122" valeur="Nom du personnage" largeur="195" hauteur="10"/>
<area id="notes" position_haut="40" position_gauche="17" largeur="62" hauteur="62"/>
<balise_jet des="0D10" titre="Initiative" balise_jet="balise_jet" balise_jet_code="0D10" balise_jet_param="titre=Initiative"><total id="initiative" position_haut="20" position_gauche="300" valeur="" largeur="33" hauteur="31"/></balise_jet>
</fiche>`;

test('--fiche-id : la fiche du générateur est convertie en fiche codée et appliquée à la campagne', async () => {
  const source = new InMemorySource();
  source.fiche = { id: 8, nom: 'Fiche générique', contenuXml: FICHE_XML };
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();
  const useCase = buildUseCase(source, target, downloader, false, false, 8);

  const report = await useCase.execute(1356);

  assert.equal(report.sheet?.sourceFicheId, 8);
  assert.equal(report.sheet?.ficheNom, 'Fiche générique');
  assert.equal(report.sheet?.fields, 3);
  assert.equal(report.sheet?.unsupported['balise_jet'], 1);
  assert.equal(report.sheet?.unsupported['system_jet'], 1);

  assert.equal(target.appliedSheets.length, 1);
  const sheet = target.appliedSheets[0];
  assert.equal(sheet.sourceKey, 'fiche:8');
  assert.equal(sheet.campagneId, report.targetCampaignId);
  // fond de fiche téléchargé comme les autres images de campagne
  assert.equal(
    sheet.data.templateImg,
    `/files/${report.targetCampaignId}/${buildInlineImageFilename('http://www.espritjdr.net/Upload/generateur/8/fond.png')}`
  );
  assert.equal(sheet.data.textColor, '#ffa93d');
  assert.match(sheet.data.templateFields, /id="hiddenFieldsCount" value="3"/);
  assert.match(sheet.data.templateFields, /id="JDRollUserControl_1"[^>]*style="position: absolute; top: 13px; left: 116px; width: 185px; right: auto; height: 9px; bottom: auto;"/);
  assert.match(sheet.data.templateFields, /<a id="JDRollUserControlLink2_child" data-type="textarea"/);
  assert.ok(
    downloader.calls.some(
      (c) => c.sourceUrl === 'http://www.espritjdr.net/Upload/generateur/8/fond.png'
    )
  );
});

test('--fiche-id --noimg : le lien du fond d\'origine est conservé', async () => {
  const source = new InMemorySource();
  source.fiche = { id: 8, nom: 'Fiche générique', contenuXml: FICHE_XML };
  const target = new InMemoryTarget();
  const downloader = new FakeImageDownloader();
  const useCase = buildUseCase(source, target, downloader, false, true, 8);

  await useCase.execute(1356);

  assert.equal(
    target.appliedSheets[0].data.templateImg,
    'http://www.espritjdr.net/Upload/generateur/8/fond.png'
  );
  assert.ok(downloader.calls.length === 0);
});

test('--fiche-id : une fiche inconnue échoue avec FicheNotFoundError', async () => {
  const source = new InMemorySource();
  source.fiche = null;
  const target = new InMemoryTarget();
  const useCase = buildUseCase(source, target, new FakeImageDownloader(), false, false, 99);

  await assert.rejects(() => useCase.execute(1356), FicheNotFoundError);
});

test('reprise : une fiche déjà appliquée n\'est pas reappliquée', async () => {
  const source = new InMemorySource();
  source.fiche = { id: 8, nom: 'Fiche générique', contenuXml: FICHE_XML };
  const target = new InMemoryTarget();
  target.ficheMappings.set('fiche:8', 1002);
  const useCase = buildUseCase(source, target, new FakeImageDownloader(), false, false, 8);

  const report = await useCase.execute(1356);

  assert.equal(target.appliedSheets.length, 0);
  assert.equal(report.sheet, null);
});
