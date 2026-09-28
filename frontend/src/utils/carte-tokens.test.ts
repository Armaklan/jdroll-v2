import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PIN_GEOMETRY,
  getPinAnchorStyle,
  getPinPointeColor,
  getPinCounterScaleStyle,
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

  it("le pion annule le zoom de la carte pour garder une taille d'écran constante", () => {
    assert.deepEqual(getPinCounterScaleStyle(2), {
      transform: 'scale(0.5)',
      transformOrigin: 'left top',
    });
    assert.deepEqual(getPinCounterScaleStyle(0.5), {
      transform: 'scale(2)',
      transformOrigin: 'left top',
    });
    assert.deepEqual(getPinCounterScaleStyle(1), {
      transform: 'scale(1)',
      transformOrigin: 'left top',
    });
  });

  it('un zoom invalide neutralise le contredézoomage plutôt que de casser le rendu', () => {
    assert.deepEqual(getPinCounterScaleStyle(0), {
      transform: 'scale(1)',
      transformOrigin: 'left top',
    });
    assert.deepEqual(getPinCounterScaleStyle(NaN), {
      transform: 'scale(1)',
      transformOrigin: 'left top',
    });
  });
});
