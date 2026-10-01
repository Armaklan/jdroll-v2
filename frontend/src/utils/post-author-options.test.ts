import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  groupAndFilterPostAuthors,
  matchesPostAuthorQuery,
} from './post-author-options.ts';
import { CharacterSummary } from '../types/campaign.ts';

function char(partial: Partial<CharacterSummary>): CharacterSummary {
  return {
    id: partial.id ?? 0,
    name: partial.name ?? '',
    concept: partial.concept ?? '',
    avatar: partial.avatar ?? '',
    userId: partial.userId ?? null,
    campagneId: partial.campagneId ?? 1,
  };
}

describe('matchesPostAuthorQuery', () => {
  it('ignore la casse et les accents', () => {
    const helene = char({ id: 1, name: 'Hélène de Valbrume' });
    assert.ok(matchesPostAuthorQuery(helene, 'helene'));
    assert.ok(matchesPostAuthorQuery(helene, 'HÉLÈNE'));
    assert.ok(!matchesPostAuthorQuery(helene, 'gorim'));
  });

  it('recherche aussi dans le concept', () => {
    const mage = char({ id: 1, name: 'Alric', concept: 'Mage errant' });
    assert.ok(matchesPostAuthorQuery(mage, 'errant'));
  });

  it('accepte une requête vide', () => {
    const mage = char({ id: 1, name: 'Alric' });
    assert.ok(matchesPostAuthorQuery(mage, ''));
    assert.ok(matchesPostAuthorQuery(mage, '   '));
  });
});

describe('groupAndFilterPostAuthors', () => {
  const pnj1 = char({ id: 1, name: 'Aubergiste', userId: null });
  const pj1 = char({ id: 2, name: 'Boran', userId: 42 });
  const pnj2 = char({ id: 3, name: 'Capitaine Gorse', userId: null });
  const pj2 = char({ id: 4, name: 'Dahlia', userId: 7 });

  it('sépare les PNJ (sans utilisateur) et les PJ (avec utilisateur)', () => {
    const groups = groupAndFilterPostAuthors([pj1, pnj1, pj2, pnj2], '');
    assert.deepEqual(groups.pnj.map((c) => c.id), [1, 3]);
    assert.deepEqual(groups.pj.map((c) => c.id), [2, 4]);
  });

  it('garde les personnages triés par nom dans chaque groupe', () => {
    const groups = groupAndFilterPostAuthors(
      [char({ id: 10, name: 'Zoé', userId: 1 }), char({ id: 11, name: 'Anna', userId: 2 })],
      ''
    );
    assert.deepEqual(groups.pj.map((c) => c.name), ['Anna', 'Zoé']);
  });

  it('filtre par nom sans distinguer les groupes', () => {
    const groups = groupAndFilterPostAuthors([pj1, pnj1, pnj2, pj2], 'bor');
    assert.deepEqual(groups.pnj.map((c) => c.id), []);
    assert.deepEqual(groups.pj.map((c) => c.id), [2]);
  });

  it('retourne des groupes vides si aucun personnage ne correspond', () => {
    const groups = groupAndFilterPostAuthors([pnj1, pj1], 'xyzt');
    assert.deepEqual(groups.pnj, []);
    assert.deepEqual(groups.pj, []);
  });
});
