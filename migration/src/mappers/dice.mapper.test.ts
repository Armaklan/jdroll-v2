import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiceDescription,
  buildDiceFormula,
  buildDiceResultHtml,
  buildDicePostContent,
  mapDiceRequest,
} from './dice.mapper.js';
import { SourceDiceRequest } from '../types.js';

const SKILL_REQUEST: SourceDiceRequest = {
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
};

const GENERIC_REQUEST: SourceDiceRequest = {
  id: 503,
  intervenantFromId: 43,
  intervenantToId: 50,
  typeJet: 'PJ',
  jetSecret: false,
  nom: 'Héraïs Abayancehill',
  jets: ['0|0|D6|-2|2'],
  etat: 3,
  nbjet: 1,
  title: 'Jet pour Héraïs Abayancehill (g&eacute;n&eacute;rique : 2 D6-2)',
  resultat: null,
  campagneId: 1356,
  postThemeId: null,
};

const PENDING_REQUEST: SourceDiceRequest = {
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
};

test('buildDiceDescription décode les entités HTML du titre', () => {
  assert.equal(
    buildDiceDescription(SKILL_REQUEST),
    'Jet pour Héraïs Abayancehill (Perception) / 9 att  bonus ( 0)'
  );
});

test('buildDiceFormula convertit les lignes de jet en formules jdroll', () => {
  // Jet de compétence : le type de dé du champ Jet (D10 -> d10)
  assert.equal(buildDiceFormula(SKILL_REQUEST), 'd10');
  // Jet générique : modificateur puis nombre de dés
  assert.equal(buildDiceFormula(GENERIC_REQUEST), '2d6-2');
  // Plusieurs jets : séparés par ' + '
  const multi: SourceDiceRequest = {
    ...SKILL_REQUEST,
    jets: ['11|0|D10|Perception|7|0|2|-1|0|9', '11|0|2D10|Prouesse|11|0|2|0|0|17'],
  };
  assert.equal(buildDiceFormula(multi), 'd10 + 2d10');
  // Jet générique simple (nombre de dé seul)
  assert.equal(buildDiceFormula({ ...GENERIC_REQUEST, jets: ['0|0|D6|3'] }), '3d6');
  // Jet générique récent : formule complète dans le champ suivant
  assert.equal(buildDiceFormula({ ...GENERIC_REQUEST, jets: ['0|0|0|d20||2|1|0'] }), 'd20');
  assert.equal(buildDiceFormula({ ...GENERIC_REQUEST, jets: ['0|0|0|2D10+1D4|1|1|0'] }), '2d10+1d4');
});

test('buildDiceResultHtml nettoie le rendu historique : entités, images de dés, balises', () => {
  // L'entête "Demande de jet de dés de X :" est retirée, l'image du dé devient
  // la notation jdroll "d10 ( 2 )" (rendue en SVG par le frontend), les <br />
  // deviennent des sauts de ligne HTML.
  assert.equal(
    buildDiceResultHtml(SKILL_REQUEST),
    'Jet de Perception : 9 =&gt; (  d10 ( 2 )) + 7'
  );
  // Sans résultat : chaîne vide
  assert.equal(buildDiceResultHtml(PENDING_REQUEST), '');
});

test('buildDicePostContent génère une carte de jet identique à celles du site', () => {
  const content = buildDicePostContent(SKILL_REQUEST);

  assert.match(content, /^<div class="dice-roll-card p-2 my-2 text-slate-800">/);
  assert.match(content, /<\/div>$/);
  // Description décodée dans l'entête
  assert.ok(
    content.includes(
      'Jet de dés : <span class="text-slate-900 font-semibold">Jet pour Héraïs Abayancehill (Perception) / 9 att  bonus ( 0)</span>'
    )
  );
  // Formule demandée
  assert.ok(content.includes('Formule demandée :'));
  assert.ok(content.includes('<code class="px-2 py-0.5 font-mono font-bold text-indigo-600 text-xs">d10</code>'));
  // Détail des dés : résultat historique nettoyé
  assert.ok(
    content.includes(
      'Jet de Perception : 9 =&gt; (  d10 ( 2 )) + 7'
    )
  );
});

test("buildDicePostContent d'un jet sans résultat affiche une note d'attente", () => {
  const content = buildDicePostContent(PENDING_REQUEST);
  assert.ok(content.includes('Jet secret pour Jeremy Elgmoore (Esprit-Ame) bonus ( 0)'));
  assert.ok(content.includes('Jet demandé, sans résultat enregistré.'));
});

test('mapDiceRequest construit une ligne dicer : titre en description, résultat nettoyé tronqué à 500', () => {
  const roll = mapDiceRequest(SKILL_REQUEST, 1002, 500, '2022-05-26 19:26:21');

  assert.deepEqual(roll, {
    sourceId: 501,
    userId: 500,
    campagneId: 1002,
    createDate: '2022-05-26 19:26:21',
    result: 'Jet de Perception : 9 =&gt; (  d10 ( 2 )) + 7',
    description: 'Jet pour Héraïs Abayancehill (Perception) / 9 att  bonus ( 0)',
  });

  // Résultat vide pour un jet sans résultat, createDate nullable
  const pending = mapDiceRequest(PENDING_REQUEST, 1002, 500, null);
  assert.equal(pending.result, '');
  assert.equal(pending.createDate, null);
  assert.equal(pending.description, 'Jet secret pour Jeremy Elgmoore (Esprit-Ame) bonus ( 0)');

  // Troncature à 500 caractères
  const long: SourceDiceRequest = {
    ...SKILL_REQUEST,
    resultat: 'Demande de jet : <br \\>' + 'x'.repeat(600) + '<br />',
  };
  const truncated = mapDiceRequest(long, 1002, 500, null);
  assert.equal(truncated.result.length, 500);
});
