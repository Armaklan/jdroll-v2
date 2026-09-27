import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIN_GEOMETRY,
  getPinAnchorStyle,
  getPinPointeColor,
} from './carte-tokens.js';

describe('carte-tokens (pions épingles)', () => {
  it('le badge repose exactement sur la base de la pointe', () => {
    assert.equal(PIN_GEOMETRY.badgeBottomOffset, PIN_GEOMETRY.triangleHeight);
  });

  it("l'étiquette est sous la pointe, sans masquer le point d'ancrage", () => {
    assert.ok(
      PIN_GEOMETRY.labelTop >= PIN_GEOMETRY.triangleHeight + PIN_GEOMETRY.labelGap
    );
  });

  it("l'ancre du pion est la pointe : position en px, sans centrage sur le badge", () => {
    const style = getPinAnchorStyle({ left: 120, top: 80 });

    assert.equal(style.left, '120px');
    assert.equal(style.top, '80px');
    assert.equal(style.transform, undefined);
  });

  it('la couleur de la pointe suit le statut du marqueur', () => {
    assert.equal(getPinPointeColor({ isOwner: true, isDraggable: true }), '#10b981');
    assert.equal(getPinPointeColor({ isOwner: false, isDraggable: true }), '#4f46e5');
    assert.equal(getPinPointeColor({ isOwner: false, isDraggable: false }), '#334155');
  });
});
