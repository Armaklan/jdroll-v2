import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHjPrivateBlock } from './hj.mapper.js';
import { SourceHjPost } from '../types.js';

function hjPost(overrides: Partial<SourceHjPost> = {}): SourceHjPost {
  return {
    id: 10,
    postThemeId: 2,
    intervenantFromId: 50,
    intervenantFromNom: 'H&eacute;ra&iuml;s Abayancehill',
    contenu: '<p>Question HJ sur la sc&egrave;ne</p>',
    dateCreation: '2022-05-26 19:30:00',
    reponses: [],
    ...overrides,
  };
}

test('buildHjPrivateBlock enveloppe le HJ et ses réponses dans une balise private ciblant l\'intervenant', () => {
  const source = hjPost({
    reponses: [
      {
        id: 100,
        hjPostId: 10,
        intervenantId: 43,
        intervenantNom: 'Maitre du Jeu',
        contenu: 'R&eacute;ponse du MJ',
        dateCreation: '2022-05-26 20:00:00',
      },
      {
        id: 101,
        hjPostId: 10,
        intervenantId: 43,
        intervenantNom: 'Maitre du Jeu',
        contenu: 'Seconde r&eacute;ponse',
        dateCreation: '2022-05-26 20:10:00',
      },
    ],
  });

  assert.equal(
    buildHjPrivateBlock(source),
    [
      '[private=Héraïs Abayancehill]',
      '<p>Question HJ sur la sc&egrave;ne</p>',
      '<p><strong>Maitre du Jeu :</strong> R&eacute;ponse du MJ</p>',
      '<p><strong>Maitre du Jeu :</strong> Seconde r&eacute;ponse</p>',
      '[/private]',
    ].join('\n')
  );
});

test('buildHjPrivateBlock sans réponse ne contient que le contenu du HJ', () => {
  assert.equal(
    buildHjPrivateBlock(hjPost({ contenu: 'Une simple question' })),
    [
      '[private=Héraïs Abayancehill]',
      'Une simple question',
      '[/private]',
    ].join('\n')
  );
});

test('buildHjPrivateBlock décode les entités du nom de l\'intervenant cible', () => {
  const block = buildHjPrivateBlock(hjPost({ intervenantFromNom: 'Gw&eacute;na&euml;lle' }));

  assert.ok(block.startsWith('[private=Gwénaëlle]'));
});
