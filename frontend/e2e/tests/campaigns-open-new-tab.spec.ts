import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests d'ouverture d'une campagne dans un nouvel onglet depuis
 * les écrans de listing des campagnes
 * (ctrl+clic / clic droit -> nouvel onglet, permis par de vraies balises <a href>)
 */

/**
 * Enregistre un utilisateur de test et renvoie son token
 */
async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_ctab_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

/**
 * Crée une campagne de test dont l'utilisateur est le MJ
 */
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
      description: '<p>Campagne de test e2e nouvel onglet</p>',
      nbJoueurs: 4,
      statut: 0,
      isRecrutementOpen,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.campaign.id as number;
}

test.describe('Ouvrir une campagne dans un nouvel onglet depuis un listing', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('Mes campagnes : ctrl+clic sur une carte ouvre la campagne dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignId = await createCampaign(
      request,
      token,
      `E2E Nouvel Onglet Mes Campagnes ${Date.now()}`,
      false
    );

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/my-campaigns');

    // La carte de campagne doit être un vrai lien avec un href
    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: ctrl+clic sur la carte
    const newPagePromise = context.waitForEvent('page');
    await cardLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre sur le forum de la campagne
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(new RegExp(`/forum/${campaignId}$`));

    // L'onglet d'origine reste sur le listing
    await expect(page).toHaveURL(/my-campaigns/);
  });

  test('Mes campagnes : clic simple navigue toujours dans le même onglet (SPA)', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignId = await createCampaign(
      request,
      token,
      `E2E Clic Simple Mes Campagnes ${Date.now()}`,
      false
    );

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/my-campaigns');

    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: clic simple
    await cardLink.click();

    // Assert: navigation dans le même onglet vers le forum
    await expect(page).toHaveURL(new RegExp(`/forum/${campaignId}$`));
  });

  test('Toutes les campagnes : ctrl+clic sur une carte ouvre la campagne dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);
    const campaignId = await createCampaign(
      request,
      token,
      `E2E Nouvel Onglet Toutes Campagnes ${Date.now()}`,
      true
    );

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/join-campaign');

    // La carte de campagne doit être un vrai lien avec un href
    const cardLink = page.locator(`a[href="/forum/${campaignId}"]`).first();
    await expect(cardLink).toBeVisible();

    // Act: ctrl+clic sur la carte
    const newPagePromise = context.waitForEvent('page');
    await cardLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre sur le forum de la campagne
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(new RegExp(`/forum/${campaignId}$`));
  });
});
