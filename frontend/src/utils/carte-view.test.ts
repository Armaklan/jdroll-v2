import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeFitView, computePinchView } from './carte-view.js';

/**
 * Calcul de la vue initiale d'une carte : zoom d'ajustement + pan pour que
 * l'image soit centrée dans la zone d'affichage, quelle que soit sa taille
 * réelle (et non une taille par défaut).
 */

describe('computeFitView (cadrage initial de la carte)', () => {
  const container = { width: 960, height: 744 };

  it('une image plus grande que la zone est ajustée et centrée sur les deux axes', () => {
    const view = computeFitView({ width: 3308, height: 2340 }, container);

    // Zoom d'ajustement : l'image tient dans la zone (marge comprise) sur l'axe le plus contraint
    assert.ok(view.zoom * 3308 <= container.width, 'la largeur affichée dépasse la zone');
    assert.ok(view.zoom * 2340 <= container.height, 'la hauteur affichée dépasse la zone');

    // Centrage : marges identiques à gauche/droite et haut/bas
    assert.ok(Math.abs(view.pan.x - (container.width - 3308 * view.zoom) / 2) < 0.001);
    assert.ok(Math.abs(view.pan.y - (container.height - 2340 * view.zoom) / 2) < 0.001);
  });

  it('une image de 1200px de large (taille par défaut du composant) est tout de même cadrée sur sa hauteur réelle', () => {
    const view = computeFitView({ width: 1200, height: 900 }, container);

    // Le zoom doit être calculé avec la hauteur réelle (900), pas une hauteur par défaut (800)
    const expectedZoom = Math.min((container.width - 40) / 1200, (container.height - 40) / 900);
    assert.ok(Math.abs(view.zoom - expectedZoom) < 0.001);

    // Centrage vertical avec la hauteur réelle
    assert.ok(Math.abs(view.pan.y - (container.height - 900 * view.zoom) / 2) < 0.001);
  });

  it("une petite image est agrandie jusqu'au plafond de zoom et reste centrée", () => {
    const view = computeFitView({ width: 100, height: 100 }, container);

    assert.equal(view.zoom, 1.5);
    assert.ok(Math.abs(view.pan.x - (container.width - 100 * view.zoom) / 2) < 0.001);
    assert.ok(Math.abs(view.pan.y - (container.height - 100 * view.zoom) / 2) < 0.001);
  });

  it('une image gigantesque garde le zoom plancher et déborde symétriquement', () => {
    const view = computeFitView({ width: 20000, height: 20000 }, container);

    assert.equal(view.zoom, 0.2);
    // Débordement identique des deux côtés : l'image reste centrée
    assert.ok(Math.abs(view.pan.x - (container.width - 20000 * view.zoom) / 2) < 0.001);
    assert.ok(Math.abs(view.pan.y - (container.height - 20000 * view.zoom) / 2) < 0.001);
  });

  it('des dimensions inconnues ne produisent pas de NaN', () => {
    const view = computeFitView({ width: 0, height: 0 }, container);
    assert.ok(Number.isFinite(view.zoom));
    assert.ok(Number.isFinite(view.pan.x));
    assert.ok(Number.isFinite(view.pan.y));

    const viewNoContainer = computeFitView({ width: 800, height: 600 }, { width: 0, height: 0 });
    assert.ok(Number.isFinite(viewNoContainer.zoom));
    assert.ok(Number.isFinite(viewNoContainer.pan.x));
    assert.ok(Number.isFinite(viewNoContainer.pan.y));
  });
});

describe('computePinchView (geste de pincement à deux doigts)', () => {
  const mid = { x: 200, y: 150 };

  it('un pincement qui s\'écarte zoome et garde le point sous les doigts fixe', () => {
    const view = computePinchView(
      { zoom: 1, pan: { x: 0, y: 0 } },
      { previousMid: mid, currentMid: mid, previousDist: 100, currentDist: 200 }
    );

    assert.ok(Math.abs(view.zoom - 2) < 0.001);
    // Le point image sous le milieu du pincement reste sous le milieu
    const before = { x: (mid.x - 0) / 1, y: (mid.y - 0) / 1 };
    const after = { x: (mid.x - view.pan.x) / view.zoom, y: (mid.y - view.pan.y) / view.zoom };
    assert.ok(Math.abs(after.x - before.x) < 0.001);
    assert.ok(Math.abs(after.y - before.y) < 0.001);
  });

  it('deux doigts qui se déplacent sans changer d\'écart déplacent la carte', () => {
    const view = computePinchView(
      { zoom: 2, pan: { x: 10, y: 20 } },
      {
        previousMid: mid,
        currentMid: { x: mid.x + 50, y: mid.y + 30 },
        previousDist: 120,
        currentDist: 120,
      }
    );

    assert.ok(Math.abs(view.zoom - 2) < 0.001);
    assert.ok(Math.abs(view.pan.x - 60) < 0.001);
    assert.ok(Math.abs(view.pan.y - 50) < 0.001);
  });

  it('le zoom est borné entre 0.2 et 5', () => {
    const tooFar = computePinchView(
      { zoom: 4, pan: { x: 0, y: 0 } },
      { previousMid: mid, currentMid: mid, previousDist: 100, currentDist: 300 }
    );
    assert.equal(tooFar.zoom, 5);

    const tooClose = computePinchView(
      { zoom: 0.3, pan: { x: 0, y: 0 } },
      { previousMid: mid, currentMid: mid, previousDist: 200, currentDist: 50 }
    );
    assert.equal(tooClose.zoom, 0.2);
  });

  it('un écart précédent nul ou invalide ne change pas la vue', () => {
    const unchanged = { zoom: 1.5, pan: { x: 12, y: -8 } };
    const view = computePinchView(unchanged, {
      previousMid: mid,
      currentMid: mid,
      previousDist: 0,
      currentDist: 100,
    });
    assert.deepEqual(view, unchanged);
  });
});
