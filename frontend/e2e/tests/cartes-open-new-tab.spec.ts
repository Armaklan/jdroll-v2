import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests d'ouverture des cartes dans un nouvel onglet depuis le listing
 * (ctrl+clic / clic droit -> nouvel onglet, permis par de vraies balises <a href>)
 */

/**
 * Trouve une campagne dont l'écran de listing des cartes contient au moins une carte
 */
async function findCampaignWithCarte(request: APIRequestContext): Promise<{
  campaignId: number;
  carteId: number;
}> {
  const res = await request.get(`/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns) {
    const cartesRes = await request.get(
      `/api/campaigns/${campaign.id}/cartes`,
    );
    if (!cartesRes.ok()) continue;
    const cartes = (await cartesRes.json()) as Array<{ id: number }>;
    const carte = cartes.find((c) => Boolean(c.id));
    if (carte) {
      return { campaignId: campaign.id, carteId: carte.id };
    }
  }
  throw new Error('Aucune campagne avec une carte trouvée pour le test');
}

test.describe('Ouvrir une carte dans un nouvel onglet', () => {
  test('Listing des cartes : ctrl+clic sur une carte ouvre un nouvel onglet', async ({
    page,
    context,
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { campaignId } = await findCampaignWithCarte(request);
    await request.dispose();

    await page.goto(`/campaigns/${campaignId}/cartes`);

    // La carte doit être un vrai lien avec un href
    const carteLink = page
      .locator(`a[href^="/campaigns/${campaignId}/cartes/"]`)
      .first();
    await expect(carteLink).toBeVisible();

    // Act: ctrl+clic sur le lien
    const newPagePromise = context.waitForEvent('page');
    await carteLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre sur la carte
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(
      new RegExp(`/campaigns/${campaignId}/cartes/\\d+$`),
    );
  });
});
