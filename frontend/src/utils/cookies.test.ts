import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serializeCookie, parseCookie } from './cookies.js';

describe('cookies utils', () => {
  it('serializeCookie produit une directive cookie avec Max-Age, Path et SameSite', () => {
    const directive = serializeCookie('jdroll_token', 'abc123', { maxAgeDays: 30, path: '/' });

    assert.equal(
      directive,
      'jdroll_token=abc123; Path=/; Max-Age=2592000; SameSite=Lax'
    );
  });

  it('serializeCookie encode la valeur du token (JWT avec points conservés)', () => {
    const directive = serializeCookie('jdroll_token', 'a.b.c', { maxAgeDays: 30, path: '/' });

    assert.match(directive, /^jdroll_token=a\.b\.c;/);
  });

  it('parseCookie retrouve la valeur parmi plusieurs cookies', () => {
    const cookieString = 'other=x; jdroll_token=abc123; another=y';

    assert.equal(parseCookie(cookieString, 'jdroll_token'), 'abc123');
  });

  it('parseCookie retourne null si le cookie est absent', () => {
    const cookieString = 'other=x; another=y';

    assert.equal(parseCookie(cookieString, 'jdroll_token'), null);
  });

  it('parseCookie retourne null pour une chaîne vide', () => {
    assert.equal(parseCookie('', 'jdroll_token'), null);
  });

  it('parseCookie gère les espaces autour du nom et de la valeur', () => {
    assert.equal(parseCookie(' jdroll_token = abc123 ', 'jdroll_token'), 'abc123');
  });
});
