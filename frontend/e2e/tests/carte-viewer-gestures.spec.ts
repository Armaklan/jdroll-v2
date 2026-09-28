import { test, expect, Page } from '@playwright/test';
import { devices } from '@playwright/test';
import { buildSolidPng, seedCarte } from './helpers/carte-seed';

/**
 * Tests des gestes tactiles standards du viewer de carte sur mobile :
 * - déplacement de la carte à un doigt (pan) ;
 * - zoom par pincement à deux doigts, ancré sur le centre du pincement.
 */

test.use({ ...devices['Pixel 5'] });

const TRANSITION_SETTLE_MS = 250;

interface MapViewState {
  zoom: number;
  panX: number;
  panY: number;
  containerLeft: number;
  containerTop: number;
}

async function readMapView(page: Page): Promise<MapViewState> {
  return page.evaluate(() => {
    const img = document.querySelector('div.origin-top-left > img');
    const mapDiv = img!.parentElement!;
    const container = mapDiv.parentElement!;
    const matrix = new DOMMatrix(getComputedStyle(mapDiv).transform);
    const cr = container.getBoundingClientRect();
    return {
      zoom: matrix.a,
      panX: matrix.e,
      panY: matrix.f,
      containerLeft: cr.left,
      containerTop: cr.top,
    };
  });
}

/**
 * Simule un pincement à deux doigts centré sur mid, l'écart entre les
 * doigts passant de startDist à endDist.
 */
async function pinch(
  page: Page,
  mid: { x: number; y: number },
  startDist: number,
  endDist: number
) {
  await page.evaluate(
    ({ mid, startDist, endDist }) => {
      const container = document.querySelector('div.origin-top-left')!.parentElement!;
      const fire = (type: string, touches: Array<{ id: number; x: number; y: number }>) => {
        const list = touches.map(
          (t) =>
            new Touch({
              identifier: t.id,
              target: container,
              clientX: t.x,
              clientY: t.y,
            })
        );
        container.dispatchEvent(
          new TouchEvent(type, {
            touches: list,
            changedTouches: list,
            bubbles: true,
            cancelable: true,
          })
        );
      };

      const pointsAt = (dist: number) => [
        { id: 1, x: mid.x - dist / 2, y: mid.y },
        { id: 2, x: mid.x + dist / 2, y: mid.y },
      ];

      fire('touchstart', pointsAt(startDist));
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const dist = startDist + ((endDist - startDist) * i) / steps;
        fire('touchmove', pointsAt(dist));
      }
      fire('touchend', []);
    },
    { mid, startDist, endDist }
  );
}

/**
 * Simule un glissé à un doigt.
 */
async function dragOneFinger(page: Page, from: { x: number; y: number }, delta: { x: number; y: number }) {
  await page.evaluate(
    ({ from, delta }) => {
      const container = document.querySelector('div.origin-top-left')!.parentElement!;
      const fire = (type: string, touches: Array<{ id: number; x: number; y: number }>) => {
        const list = touches.map(
          (t) =>
            new Touch({
              identifier: t.id,
              target: container,
              clientX: t.x,
              clientY: t.y,
            })
        );
        container.dispatchEvent(
          new TouchEvent(type, {
            touches: list,
            changedTouches: list,
            bubbles: true,
            cancelable: true,
          })
        );
      };

      fire('touchstart', [{ id: 1, x: from.x, y: from.y }]);
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        fire('touchmove', [
          {
            id: 1,
            x: from.x + (delta.x * i) / steps,
            y: from.y + (delta.y * i) / steps,
          },
        ]);
      }
      fire('touchend', []);
    },
    { from, delta }
  );
}

test.describe('Gestes tactiles du viewer de carte (mobile)', () => {
  test.beforeEach(async ({ request }) => {
    test.setTimeout(60000);
  });

  test('un pincement à deux doigts zoome sur le centre du pincement', async ({
    page,
    request,
  }) => {
    const { campaignId, carteId } = await seedCarte(
      request,
      buildSolidPng(2000, 1400, [30, 90, 60]),
      'Carte gestures mobile',
      { tabReduce: true }
    );

    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);
    await expect(page.locator('div.origin-top-left > img')).toBeVisible();
    await page.waitForTimeout(500);

    const before = await readMapView(page);
    expect(before.zoom).toBeGreaterThan(0);

    const mid = {
      x: before.containerLeft + 196,
      y: before.containerTop + 350,
    };
    await pinch(page, mid, 60, 180);
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    const after = await readMapView(page);

    // Le zoom a augmenté (écart doublé puis re-doublé, borné par le zoom max)
    expect(after.zoom).toBeGreaterThan(before.zoom * 1.5);

    // Le point image situé sous le centre du pincement y reste (ancrage)
    const imagePointBefore = {
      x: (mid.x - before.containerLeft - before.panX) / before.zoom,
      y: (mid.y - before.containerTop - before.panY) / before.zoom,
    };
    const imagePointAfter = {
      x: (mid.x - after.containerLeft - after.panX) / after.zoom,
      y: (mid.y - after.containerTop - after.panY) / after.zoom,
    };
    expect(Math.abs(imagePointAfter.x - imagePointBefore.x)).toBeLessThan(5);
    expect(Math.abs(imagePointAfter.y - imagePointBefore.y)).toBeLessThan(5);
  });

  test('un glissé à un doigt déplace la carte', async ({ page, request }) => {
    const { campaignId, carteId } = await seedCarte(
      request,
      buildSolidPng(2000, 1400, [60, 30, 90]),
      'Carte gestures mobile 2',
      { tabReduce: true }
    );

    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);
    await expect(page.locator('div.origin-top-left > img')).toBeVisible();
    await page.waitForTimeout(500);

    const before = await readMapView(page);

    await dragOneFinger(page, { x: before.containerLeft + 150, y: before.containerTop + 300 }, { x: -80, y: 60 });
    await page.waitForTimeout(TRANSITION_SETTLE_MS);

    const after = await readMapView(page);

    // Le zoom n'a pas changé
    expect(Math.abs(after.zoom - before.zoom)).toBeLessThan(0.001);
    // La carte a suivi le doigt
    expect(Math.abs(after.panX - before.panX - -80)).toBeLessThan(3);
    expect(Math.abs(after.panY - before.panY - 60)).toBeLessThan(3);
  });
});
