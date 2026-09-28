import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasPreviousHistoryEntry } from './back-navigation.js';

describe('back-navigation (bouton retour du viewer de carte)', () => {
  it('détecte un précédent quand react-router a un idx > 0 dans history.state', () => {
    assert.strictEqual(hasPreviousHistoryEntry({ usr: null, key: 'abc', idx: 1 }), true);
    assert.strictEqual(hasPreviousHistoryEntry({ usr: null, key: 'abc', idx: 3 }), true);
  });

  it('n a pas de précédent au premier chargement d un onglet (idx = 0)', () => {
    assert.strictEqual(hasPreviousHistoryEntry({ usr: null, key: 'default', idx: 0 }), false);
  });

  it('n a pas de précédent si history.state est absent ou sans idx', () => {
    assert.strictEqual(hasPreviousHistoryEntry(null), false);
    assert.strictEqual(hasPreviousHistoryEntry(undefined), false);
    assert.strictEqual(hasPreviousHistoryEntry({}), false);
    assert.strictEqual(hasPreviousHistoryEntry({ usr: null, key: 'x' }), false);
  });
});
