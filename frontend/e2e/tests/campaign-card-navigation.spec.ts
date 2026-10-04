import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests de navigation des cartes de campagne :
 * - "Rejoindre une campagne" / "Toutes les campagnes" : le clic simple
 *   ouvre la fiche détail (modale) SANS naviguer vers le forum.
 * - "Mes campagnes" : le clic simple navigue vers le forum.
 */

async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_cardnav_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username}@test.local`,
      password: 'Passw0rd!123',
      website: '',
      elapsedMs: 10000,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.token as string;
}

async function createCampaign(
  request: APIRequestContext,
  token: string,
  name: string,
  isRecrutementOpen: boolean
): Promise<number> {
  const response = await request.post('/api/campaigns', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      systeme: 'D&D 5e',
      univers: 'Test',
      description: '<p>Campagne de test navigation carte</p>',
      nbJoueurs: 4,
      statut: 0,
      isRecrutementOpen,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.campaign.id as number;
}

test.describe('Navigation des cartes de campagne', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('Rejoindre une campagne : le clic simple ouvre la fiche détail sans naviguer vers le forum', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignName = `E2E Carte Rejoindre ${Date.now()}`;
    const campaignId = await createCampaign(request, token, campaignName, true);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/join-campaign');

    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: clic simple sur la carte
    await cardLink.click();

    // Assert: la page reste sur le listing (pas de navigation forum)...
    await expect(page).toHaveURL(/join-campaign/);

    // ...et la modale de détail est ouverte
    await expect(page.getByRole('button', { name: 'Voir le forum' })).toBeVisible();

    // Fermer la modale : on reste sur le listing, pas de navigation différée
    await page.getByRole('button', { name: 'Fermer' }).last().click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/join-campaign/);
    await expect(page.getByRole('button', { name: 'Voir le forum' })).toBeHidden();
  });

  test('Toutes les campagnes : le clic simple ouvre la fiche détail sans naviguer vers le forum', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignName = `E2E Carte Toutes ${Date.now()}`;
    const campaignId = await createCampaign(request, token, campaignName, false);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/join-campaign?filter=all');

    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: clic simple sur la carte
    await cardLink.click();

    // Assert: la page reste sur le listing (pas de navigation forum)...
    await expect(page).toHaveURL(/join-campaign/);

    // ...et la modale de détail est ouverte
    await expect(page.getByRole('button', { name: 'Voir le forum' })).toBeVisible();
  });

  test('Mes campagnes : le clic simple navigue vers le forum de la campagne', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignId = await createCampaign(
      request,
      token,
      `E2E Carte Mes Campagnes ${Date.now()}`,
      false
    );

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/my-campaigns');

    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: clic simple sur la carte
    await cardLink.click();

    // Assert: navigation vers le forum
    await expect(page).toHaveURL(new RegExp(`/forum/${campaignId}$`));
  });
});
