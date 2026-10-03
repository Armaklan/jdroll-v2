import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeHtmlEntities,
  buildSectionTitle,
  buildTopicTitle,
  mapCampaignStatut,
  mapCampaign,
  mapIntervenant,
} from './espritjdr.mapper.js';
import { SourceCampaign, SourceIntervenant } from '../types.js';

test('decodeHtmlEntities décode les entités nommées latines courantes', () => {
  assert.equal(decodeHtmlEntities('R&egrave;gles de post'), 'Règles de post');
  assert.equal(decodeHtmlEntities('&Eacute;cole'), 'École');
  assert.equal(decodeHtmlEntities('&Ccedil;a marche'), 'Ça marche');
  assert.equal(decodeHtmlEntities('O&ugrave; ?'), 'Où ?');
  assert.equal(decodeHtmlEntities('&agrave; &acirc; &ecirc; &icirc; &ocirc; &ucirc;'), 'à â ê î ô û');
  assert.equal(decodeHtmlEntities('Pont &amp; chauss&eacute;es'), 'Pont & chaussées');
});

test('decodeHtmlEntities décode les entités numériques', () => {
  assert.equal(decodeHtmlEntities('num&#233;rique'), 'numérique');
  assert.equal(decodeHtmlEntities('hex&#xE9;'), 'hexé');
});

test('decodeHtmlEntities laisse le texte inchangé si aucune entité', () => {
  assert.equal(decodeHtmlEntities('Texte simple'), 'Texte simple');
  assert.equal(decodeHtmlEntities('Entit&eacute inconnue'), 'Entit&eacute inconnue');
});

test('decodeHtmlEntities trim le résultat', () => {
  assert.equal(decodeHtmlEntities('  Espaced  '), 'Espaced');
});

test('buildSectionTitle retourne le libellé de l\'espace seul sans intercalaire', () => {
  assert.equal(buildSectionTitle('Discussions libres', null), 'Discussions libres');
});

test('buildSectionTitle joint espace et intercalaire avec " > "', () => {
  assert.equal(buildSectionTitle('Contexte et Règles', 'Secondaire'), 'Contexte et Règles > Secondaire');
});

test('buildTopicTitle joint groupe et thème avec " > "', () => {
  assert.equal(buildTopicTitle('Principale', 'Guerrier'), 'Principale > Guerrier');
});

test('mapCampaignStatut convertit les statuts espritjdr vers jdroll', () => {
  assert.equal(mapCampaignStatut(1), 3); // En préparation -> En préparation
  assert.equal(mapCampaignStatut(2), 0); // Ouverte -> active
  assert.equal(mapCampaignStatut(3), 2); // Fermée -> archivée
  assert.equal(mapCampaignStatut(4), 2); // Bloquée -> archivée
  assert.equal(mapCampaignStatut(5), 1); // En pause -> en pause
  // Statut inconnu : campagne active par défaut
  assert.equal(mapCampaignStatut(99), 0);
});

test('mapCampaign produit les données de campagne jdroll', () => {
  const source: SourceCampaign = {
    id: 1356,
    nom: 'Agartha&nbsp;: l\'Odyss&eacute;e',
    jeuNom: 'Pathfinder 2',
    annonce: '<p>Une aventure &eacute;pique</p>',
    statutCampagneId: 2,
    inscriptionPJ: true,
    nbMaxJoueur: 4,
  };

  const result = mapCampaign(source, 42);

  assert.equal(result.mjId, 42);
  assert.equal(result.name, "Agartha : l'Odyssée");
  assert.equal(result.systeme, 'Pathfinder 2');
  assert.equal(result.univers, '');
  assert.equal(result.description, '<p>Une aventure &eacute;pique</p>');
  assert.equal(result.statut, 0);
  assert.equal(result.isRecrutementOpen, true);
  assert.equal(result.nbJoueurs, 4);
});

test('mapCampaign borne le nombre de joueurs entre 1 et 50', () => {
  const base: Omit<SourceCampaign, 'nbMaxJoueur' | 'id'> = {
    nom: 'X',
    jeuNom: 'Y',
    annonce: null,
    statutCampagneId: 2,
    inscriptionPJ: false,
  };
  assert.equal(mapCampaign({ ...base, id: 1, nbMaxJoueur: 0 }, 1).nbJoueurs, 1);
  assert.equal(mapCampaign({ ...base, id: 1, nbMaxJoueur: 999 }, 1).nbJoueurs, 50);
});

test('mapCampaign gère les champs manquants et limite le nom à 100 caractères', () => {
  const source: SourceCampaign = {
    id: 1,
    nom: 'A'.repeat(120),
    jeuNom: '',
    annonce: null,
    statutCampagneId: 1,
    inscriptionPJ: false,
    nbMaxJoueur: 3,
  };

  const result = mapCampaign(source, 7);

  assert.equal(result.name.length, 100);
  assert.equal(result.description, '');
  assert.equal(result.isRecrutementOpen, false);
  assert.equal(result.statut, 3);
});

test('mapIntervenant produit les données de PNJ jdroll depuis un intervenant', () => {
  const source: SourceIntervenant = {
    id: 50,
    nom: 'H&eacute;ra&iuml;s Abayancehill',
    descriptionPublique: '<p>Description publique</p>',
    descriptionPrivee: '<p>Description priv&eacute;e</p>',
    image: 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/50/sanstitrego.png',
  };

  const result = mapIntervenant(source, 42, '/files/42/pnj-50.png');

  assert.deepEqual(result, {
    campagneId: 42,
    name: 'Héraïs Abayancehill',
    avatar: '/files/42/pnj-50.png',
    publicDescription: '<p>Description publique</p>',
    privateDescription: '<p>Description priv&eacute;e</p>',
  });
});

test('mapIntervenant gère les descriptions absentes et limite le nom à 100 caractères', () => {
  const source: SourceIntervenant = {
    id: 106,
    nom: 'A'.repeat(120),
    descriptionPublique: null,
    descriptionPrivee: null,
    image: null,
  };

  const result = mapIntervenant(source, 1, '');

  assert.equal(result.name.length, 100);
  assert.equal(result.avatar, '');
  assert.equal(result.publicDescription, '');
  assert.equal(result.privateDescription, '');
});
