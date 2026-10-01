import { test, expect } from '@playwright/test';

/**
 * Accès aux campagnes : l'accès au contenu d'une campagne exige d'être connecté.
 * La liste publique des campagnes (carrousel de la page d'accueil, page "rejoindre")
 * reste accessible aux visiteurs.
 */
test.describe('Accès aux campagnes', () => {
  test("l'API de contenu de campagne renvoie 401 pour un visiteur non connecté", async ({ request }) => {
    const endpoints = [
      '/api/campaigns/123',
      '/api/campaigns/123/forum',
      '/api/campaigns/123/characters',
      '/api/campaigns/123/gallery',
      '/api/campaigns/123/participants',
      '/api/campaigns/123/search?q=test',
      '/api/campaigns/123/cartes',
      '/api/campaigns/123/cartes/456',
      '/api/characters/123',
      '/api/topics/123',
      '/api/campaigns/123/topics/456',
      '/api/cartes/123',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), endpoint).toBe(401);
    }
  });

  test("la liste publique des campagnes reste accessible aux visiteurs", async ({ request }) => {
    const response = await request.get('/api/campaigns');
    expect(response.ok()).toBeTruthy();
  });

  test('un visiteur non connecté est redirigé vers la connexion depuis une campagne', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/campaigns/123');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/campaigns/123/cartes');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/forum/123');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/topics/123');
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});
