import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { replaceEmoticons, convertEmoticonsOnType } from './emoticons.js';

describe('Emoticons utility', () => {
  it('devrait convertir les smileys textuels courants en emojis', () => {
    assert.equal(replaceEmoticons('Salut :)'), 'Salut 😊');
    assert.equal(replaceEmoticons('Super :-) !'), 'Super 😊 !');
    assert.equal(replaceEmoticons(':D trop drôle'), '😃 trop drôle');
    assert.equal(replaceEmoticons('clin d oeil ;)'), 'clin d oeil 😉');
    assert.equal(replaceEmoticons('triste :('), 'triste 🙁');
    assert.equal(replaceEmoticons('oups :P'), 'oups 😛');
    assert.equal(replaceEmoticons('je t adore <3'), 'je t adore ❤️');
    assert.equal(replaceEmoticons('XD haha'), '😆 haha');
  });

  it('devrait convertir les codes de dés et JDR', () => {
    assert.equal(replaceEmoticons('Je lance le dé :dice: !'), 'Je lance le dé 🎲 !');
    assert.equal(replaceEmoticons('Attaque :sword: et défense :shield:'), 'Attaque ⚔️ et défense 🛡️');
  });

  it('ne devrait pas altérer le texte normal ou les URLs', () => {
    assert.equal(replaceEmoticons('http://exemple.com/test'), 'http://exemple.com/test');
    assert.equal(replaceEmoticons('Bonjour à tous'), 'Bonjour à tous');
  });

  it('convertEmoticonsOnType détecte les changements', () => {
    const res1 = convertEmoticonsOnType('Hello :)');
    assert.equal(res1.hasChanged, true);
    assert.equal(res1.text, 'Hello 😊');

    const res2 = convertEmoticonsOnType('Hello world');
    assert.equal(res2.hasChanged, false);
    assert.equal(res2.text, 'Hello world');
  });
});
