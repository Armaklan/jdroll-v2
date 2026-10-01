import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Scroll Navigation Tests
 * Vérifie que la position de scroll est remise en haut lors d'un changement de page
 * (navigation SPA : sans rechargement complet de la page, le navigateur ne le fait pas seul)
 */
test.describe('Scroll navigation', () => {
  let homePage: HomePage;
  let navbar: Navbar;

  async function registerTestUser(request: import('@playwright/test').APIRequestContext): Promise<string> {
    const username = `e2e_scroll_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

  test.beforeEach(async ({ page, request }) => {
    homePage = new HomePage(page);
    navbar = new Navbar(page);

    // Le forum général exige d'être connecté : authentifier un utilisateur de test
    const token = await registerTestUser(request);
    await page.addInitScript((token: string) => {
      localStorage.setItem('jdroll_token', token);
    }, token);

    // Page d'accueil: attendre qu'elle soit assez haute pour scroller de 300px
    await homePage.navigate();
    await expect
      .poll(
        async () =>
          page.evaluate(() => document.body.scrollHeight - window.innerHeight),
        { timeout: 10000 },
      )
      .toBeGreaterThan(300);

    // Scroller à 300px (position faible pour ne pas être "clampée" par le
    // navigateur si la page suivante est momentanément plus courte)
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBe(300);
  });

  /**
   * Test 1: Changer de page via un lien de la navbar remet le scroll en haut
   */
  test('Scroll is reset to top when navigating to another page', async ({ page }) => {
    // Act: Naviguer vers le forum via la navbar
    await navbar.clickForum();
    await page.waitForURL(/\/forum(\/0)?$/);

    // Assert: La nouvelle page est affichée en haut
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBe(0);
  });

  /**
   * Test 2: Revenir en arrière restaure la position de scroll du navigateur
   */
  test('Back navigation restores the previous scroll position', async ({ page }) => {
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Act: Forum puis retour
    await navbar.clickForum();
    await page.waitForURL(/\/forum(\/0)?$/);
    await page.goBack();
    await page.waitForURL(/\/$/);

    // Assert: La position de scroll de l'accueil est restaurée
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBe(scrollBefore);
  });
});
