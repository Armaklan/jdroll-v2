import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTextIndex, resolveMatchRange } from './grammar-text-index';

// Fakes DOM minimaux : l'implémentation ne doit s'appuyer que sur
// nodeType / data / tagName / childNodes pour rester testable sans navigateur.
interface FakeNode {
  nodeType: number;
  data?: string;
  tagName?: string;
  childNodes?: FakeNode[];
}

function text(data: string): FakeNode {
  return { nodeType: 3, data };
}

function el(tagName: string, ...children: FakeNode[]): FakeNode {
  return { nodeType: 1, tagName, childNodes: children };
}

describe('buildTextIndex', () => {
  it('extrait le texte dun paragraphe simple avec un segment', () => {
    const root = el('div', el('p', text('Bonjour madame')));
    const index = buildTextIndex(root);

    assert.equal(index.text, 'Bonjour madame');
    assert.equal(index.segments.length, 1);
    assert.equal(index.segments[0].node, (root.childNodes![0] as FakeNode).childNodes![0]);
    assert.equal(index.segments[0].start, 0);
    assert.equal(index.segments[0].end, 14);
  });

  it('sépare les blocs par un saut de ligne', () => {
    const root = el('div', el('p', text('Premier')), el('p', text('Second')));
    const index = buildTextIndex(root);

    assert.equal(index.text, 'Premier\nSecond');
    assert.equal(index.segments.length, 2);
    assert.equal(index.segments[1].start, 8);
  });

  it('gère le texte réparti sur plusieurs nœuds inline sans séparateur', () => {
    const root = el('div', el('p', text('Bon'), el('span', text('jour')), text(' !')));
    const index = buildTextIndex(root);

    assert.equal(index.text, 'Bonjour !');
    assert.equal(index.segments.length, 3);
    assert.deepEqual(
      index.segments.map((s) => [s.start, s.end]),
      [[0, 3], [3, 7], [7, 9]]
    );
  });

  it('ignore les images (aucune contribution au texte)', () => {
    const root = el('div', el('p', text('Avant'), el('img'), text('Après')));
    const index = buildTextIndex(root);

    assert.equal(index.text, 'AvantAprès');
    assert.equal(index.segments.length, 2);
  });

  it('remplace les br par un saut de ligne', () => {
    const root = el('div', el('p', text('Ligne 1'), el('br'), text('Ligne 2')));
    const index = buildTextIndex(root);

    assert.equal(index.text, 'Ligne 1\nLigne 2');
  });

  it('sépare les éléments de liste (li) par des sauts de ligne', () => {
    const root = el(
      'div',
      el('ul', el('li', text('Un')), el('li', text('Deux')))
    );
    const index = buildTextIndex(root);

    assert.equal(index.text, 'Un\nDeux');
  });
});

describe('resolveMatchRange', () => {
  const root = el(
    'div',
    el('p', text('Bon'), el('span', text('jour'))),
    el('p', text(' madame'))
  );

  it('résout un match contenu dans un seul nœud texte', () => {
    const index = buildTextIndex(root);

    const range = resolveMatchRange(index, 0, 3);

    assert.ok(range);
    assert.equal(range.startNode, index.segments[0].node);
    assert.equal(range.startOffset, 0);
    assert.equal(range.endNode, index.segments[0].node);
    assert.equal(range.endOffset, 3);
  });

  it('résout un match à cheval sur plusieurs nœuds texte', () => {
    const index = buildTextIndex(root);

    const range = resolveMatchRange(index, 0, 7);

    assert.ok(range);
    assert.equal(range.startNode, index.segments[0].node);
    assert.equal(range.startOffset, 0);
    assert.equal(range.endNode, index.segments[1].node);
    assert.equal(range.endOffset, 4);
  });

  it('résout un match à cheval sur deux blocs via le séparateur', () => {
    const index = buildTextIndex(root);

    const range = resolveMatchRange(index, 9, 6); // 'madame' dans le 2e bloc

    assert.ok(range);
    assert.equal(range.startNode, index.segments[2].node);
    assert.equal(range.startOffset, 1);
    assert.equal(range.endOffset, 7);
  });

  it('retourne null quand le début du match tombe sur un séparateur', () => {
    const index = buildTextIndex(root);

    const range = resolveMatchRange(index, 7, 2); // '\n' entre les blocs

    assert.equal(range, null);
  });

  it('retourne null quand le match dépasse la fin du texte', () => {
    const index = buildTextIndex(root);

    assert.equal(resolveMatchRange(index, index.text.length, 1), null);
  });
});
