import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSectionPlans,
  buildTopicPlans,
} from './forum-structure.mapper.js';
import {
  SourceEspace,
  SourceSection,
  SourceGroupe,
  SourceTheme,
} from '../types.js';

function espace(id: number, libelle: string, ordre = id): SourceEspace {
  return { id, campagneId: 1, libelle, type: 1, ordre };
}

function section(id: number, espaceId: number, libelle: string, ordre = id): SourceSection {
  return { id, espaceId, libelle, ordre };
}

function groupe(
  id: number,
  titre: string,
  espaceId: number | null,
  sectionId: number | null,
  ordre = id,
  statutGroupeId = 1
): SourceGroupe {
  return { id, campagneId: 1, titre, espaceId, sectionId, statutGroupeId, ordre };
}

function theme(id: number, groupeId: number, titre: string, ordre = id, statutThemeId = 1): SourceTheme {
  return { id, groupeId, titre, statutThemeId, ordre };
}

test('buildSectionPlans crée une section par couple espace/intercalaire portant des groupes', () => {
  const espaces = [
    espace(10, 'RP', 3),
    espace(11, 'Hors RP', 1),
    espace(12, 'Vide', 2),
  ];
  const sections = [section(20, 10, 'Principal'), section(21, 10, 'Secondaire')];
  const groupes = [
    groupe(1, 'G1', 10, 20),
    groupe(2, 'G2', 10, 21),
    groupe(3, 'G3', 11, null),
  ];

  const plans = buildSectionPlans(espaces, sections, groupes);

  assert.equal(plans.length, 3);
  assert.deepEqual(
    plans.map((p) => p.title),
    ['Hors RP', 'RP > Principal', 'RP > Secondaire']
  );
  assert.deepEqual(plans.map((p) => p.ordre), [1, 2, 3]);
});

test('buildSectionPlans ordonne les espaces par ordre puis les intercalaires par ordre', () => {
  const espaces = [espace(10, 'A', 1), espace(11, 'B', 1)];
  const sections = [
    section(20, 10, 'Z9', 5),
    section(21, 10, 'A1', 1),
    section(22, 11, 'Solo', 1),
  ];
  const groupes = [
    groupe(1, 'G1', 10, 20),
    groupe(2, 'G2', 10, 21),
    groupe(3, 'G3', 11, 22),
  ];

  const plans = buildSectionPlans(espaces, sections, groupes);

  assert.deepEqual(
    plans.map((p) => p.title),
    ['A > A1', 'A > Z9', 'B > Solo']
  );
});

test('buildSectionPlans gère un espace avec à la fois des groupes directs et des intercalaires', () => {
  const espaces = [espace(10, 'Contexte', 1)];
  const sections = [section(20, 10, 'Règles')];
  const groupes = [
    groupe(1, 'Direct', 10, null),
    groupe(2, 'DansSection', 10, 20),
  ];

  const plans = buildSectionPlans(espaces, sections, groupes);

  assert.equal(plans.length, 2);
  assert.deepEqual(
    plans.map((p) => p.title),
    ['Contexte', 'Contexte > Règles']
  );
});

test('buildSectionPlans ignore les espaces sans groupes', () => {
  const espaces = [espace(10, 'Vide', 1), espace(11, 'Plein', 2)];
  const groupes = [groupe(1, 'G1', 11, null)];

  const plans = buildSectionPlans(espaces, [], groupes);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].title, 'Plein');
});

test('buildSectionPlans place les groupes sans espace dans une section "Sans espace" en fin', () => {
  const espaces = [espace(10, 'RP', 1)];
  const groupes = [groupe(1, 'G1', 10, null), groupe(2, 'Orphelin', null, null)];

  const plans = buildSectionPlans(espaces, [], groupes);

  assert.equal(plans.length, 2);
  assert.equal(plans[1].title, 'Sans espace');
  assert.equal(plans[1].ordre, 2);
});

test('buildSectionPlans génère des clés uniques et stables', () => {
  const espaces = [espace(10, 'RP', 1)];
  const sections = [section(20, 10, 'Principal')];
  const groupes = [groupe(1, 'G1', 10, null), groupe(2, 'G2', 10, 20)];

  const plans = buildSectionPlans(espaces, sections, groupes);

  assert.deepEqual(
    plans.map((p) => p.key),
    ['espace:10', 'espace:10:section:20']
  );
});

test('buildTopicPlans crée un topic "groupe > thème" dans la section du groupe', () => {
  const espaces = [espace(10, 'RP', 1)];
  const sections = [section(20, 10, 'Principal')];
  const groupes = [
    groupe(1, 'Accueil', 10, null, 1),
    groupe(2, 'Aventures', 10, 20, 2),
  ];
  const themes = [
    theme(100, 1, 'Absences', 1),
    theme(101, 1, 'Hors jeu', 2),
    theme(102, 2, 'Episode 1', 1),
  ];

  const sectionPlans = buildSectionPlans(espaces, sections, groupes);
  const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

  assert.equal(topicPlans.length, 3);
  assert.deepEqual(
    topicPlans.map((t) => t.title),
    ['Accueil > Absences', 'Accueil > Hors jeu', 'Aventures > Episode 1']
  );
  assert.equal(topicPlans[0].sectionKey, 'espace:10');
  assert.equal(topicPlans[2].sectionKey, 'espace:10:section:20');
  assert.equal(topicPlans[0].themeId, 100);
});

test('buildTopicPlans numérote l\'ordre séquentiellement dans chaque section', () => {
  const espaces = [espace(10, 'RP', 1), espace(11, 'HRP', 2)];
  const groupes = [groupe(1, 'G1', 10, null), groupe(2, 'G2', 11, null)];
  const themes = [
    theme(100, 1, 'T1', 2),
    theme(101, 1, 'T2', 1),
    theme(102, 2, 'T3', 1),
  ];

  const sectionPlans = buildSectionPlans(espaces, [], groupes);
  const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

  assert.deepEqual(topicPlans.map((t) => t.ordre), [1, 2, 1]);
  // thèmes d'un même groupe triés par ordre
  assert.deepEqual(
    topicPlans.slice(0, 2).map((t) => t.title),
    ['G1 > T2', 'G1 > T1']
  );
});

test('buildTopicPlans marque fermés les topics des groupes fermés ou archivés', () => {
  const espaces = [espace(10, 'RP', 1)];
  const groupes = [
    groupe(1, 'Ouvert', 10, null, 1, 1),
    groupe(2, 'Fermé', 10, null, 2, 2),
    groupe(3, 'Archivé', 10, null, 3, 3),
  ];
  const themes = [theme(100, 1, 'A'), theme(101, 2, 'B'), theme(102, 3, 'C')];

  const sectionPlans = buildSectionPlans(espaces, [], groupes);
  const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

  assert.equal(topicPlans[0].isClosed, false);
  assert.equal(topicPlans[1].isClosed, true);
  assert.equal(topicPlans[2].isClosed, true);
});
