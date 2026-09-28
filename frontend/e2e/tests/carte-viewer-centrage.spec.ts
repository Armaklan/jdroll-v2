import { test, expect } from '@playwright/test';
import { buildSolidPng, seedCarte } from './helpers/carte-seed';

/**
 * Tests du centrage initial du viewer de carte :
 * quand une carte est affichée, elle doit être ajustée et centrée
 * dans la zone d'affichage de l'écran (panneaux fermés ou non).
 *
 * Cas couverts :
 * - une image dont la largeur naturelle vaut exactement 1200px (la valeur
 *   par défaut du composant) doit malgré tout être cadrée sur ses dimensions
 *   réelles (et pas les dimensions par défaut) ;
 * - une grande image doit être ajustée pour tenir dans la zone et y être centrée.
 */

const VIEWER_MARGIN_TOLERANCE = 3;

/**
 * Mesure les marges entre l'image de la carte et la zone d'affichage.
 */
async function readMargins(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('div.origin-top-left > img');
    if (!img) return null;
    const container = img.parentElement!.parentElement!;
    const ir = img.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return {
      left: ir.left - cr.left,
      right: cr.right - ir.right,
      top: ir.top - cr.top,
      bottom: cr.bottom - ir.bottom,
      imageVisible: ir.width > 0 && ir.height > 0,
    };
  });
}

test.describe('Centrage de la carte dans la zone d\'affichage', () => {
  test('une image de 1200px de large (taille par défaut du composant) est centrée verticalement sur sa hauteur réelle', async ({
    page,
    request,
  }) => {
    // Largeur exactement égale à la valeur par défaut : le cadrage ne doit
    // pas se contenter des dimensions par défaut (1200x800) mais utiliser la
    // hauteur réelle (900).
    const { campaignId, carteId } = await seedCarte(
      request,
      buildSolidPng(1200, 900, [40, 80, 160]),
      'Carte piège 1200x900'
    );

    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);
    await expect(page.locator('div.origin-top-left > img')).toBeVisible();

    // Attendre que l'image soit chargée et le cadrage appliqué, puis vérifier le centrage
    await expect
      .poll(async () => {
        const margins = await readMargins(page);
        return margins && margins.imageVisible
          ? Math.abs(margins.top - margins.bottom)
          : Number.NaN;
      }, { timeout: 10000 })
      .toBeLessThan(VIEWER_MARGIN_TOLERANCE);

    const margins = (await readMargins(page))!;
    expect(Math.abs(margins.left - margins.right)).toBeLessThan(VIEWER_MARGIN_TOLERANCE);
  });

  test('une grande image est ajustée pour tenir dans la zone et y est centrée', async ({
    page,
    request,
  }) => {
    const { campaignId, carteId } = await seedCarte(
      request,
      buildSolidPng(2000, 1400, [90, 40, 120]),
      'Carte grande 2000x1400'
    );

    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);
    await expect(page.locator('div.origin-top-left > img')).toBeVisible();

    await expect
      .poll(async () => {
        const margins = await readMargins(page);
        return margins && margins.imageVisible
          ? Math.abs(margins.top - margins.bottom)
          : Number.NaN;
      }, { timeout: 10000 })
      .toBeLessThan(VIEWER_MARGIN_TOLERANCE);

    const margins = (await readMargins(page))!;
    // L'image tient entièrement dans la zone (ajustée) et y est centrée
    expect(margins.left).toBeGreaterThan(-VIEWER_MARGIN_TOLERANCE);
    expect(margins.right).toBeGreaterThan(-VIEWER_MARGIN_TOLERANCE);
    expect(margins.top).toBeGreaterThan(-VIEWER_MARGIN_TOLERANCE);
    expect(margins.bottom).toBeGreaterThan(-VIEWER_MARGIN_TOLERANCE);
    expect(Math.abs(margins.left - margins.right)).toBeLessThan(VIEWER_MARGIN_TOLERANCE);
  });
});
