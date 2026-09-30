import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fieldTextColorStyle } from './character-sheet.js';

describe('fieldTextColorStyle', () => {
  it('should return undefined when textColor is null or undefined', () => {
    assert.equal(fieldTextColorStyle(null), undefined);
    assert.equal(fieldTextColorStyle(undefined), undefined);
  });

  it('should return undefined for empty or whitespace-only color', () => {
    assert.equal(fieldTextColorStyle(''), undefined);
    assert.equal(fieldTextColorStyle('   '), undefined);
  });

  it('should return an inline color style for a configured color', () => {
    assert.deepEqual(fieldTextColorStyle('#ff0000'), { color: '#ff0000' });
    assert.deepEqual(fieldTextColorStyle('#123abc'), { color: '#123abc' });
  });

  it('should trim the configured color', () => {
    assert.deepEqual(fieldTextColorStyle(' #ff0000 '), { color: '#ff0000' });
  });
});
