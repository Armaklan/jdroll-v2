import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Forum Tests
 * Tests for forum-related functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Forum', () => {
  let homePage: HomePage;
  let navbar: Navbar;

  async function registerTestUser(request: import('@playwright/test').APIRequestContext): Promise<string> {
    const username = `e2e_frm_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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
    // Initialize Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);

    // Le forum général exige d'être connecté : authentifier un utilisateur de test
    const token = await registerTestUser(request);
    await page.addInitScript((token: string) => {
      localStorage.setItem('jdroll_token', token);
    }, token);

    // Start from home page
    await homePage.navigate();
  });

  /**
   * Test 1: User can navigate to Forum from navbar
   */
  test('User can navigate to Forum from navbar', async () => {
    // Act: Click on Forum link
    await navbar.clickForum();
    
    // Assert: URL should contain forum
    await expect(navbar.getPage()).toHaveURL(/forum/);
  });

  /**
   * Test 3: User can navigate to General Forum directly
   */
  test('User can navigate to General Forum directly', async ({ page }) => {
    // Act: Navigate directly to general forum
    await page.goto('/forum/0');
    
    // Assert: URL should be /forum/0
    await expect(page).toHaveURL('/forum/0');
  });

  /**
   * Test 4: Forum page is accessible
   */
  test('Forum page is accessible', async () => {
    // Act: Navigate to forum
    await navbar.clickForum();
    
    // Assert: URL contains forum
    await expect(navbar.getPage()).toHaveURL(/forum/);
    
    // Assert: Page should have some content
    await expect(navbar.getPage().locator('body')).toContainText(/forum|sujet|topic/i);
  });

  /**
   * Test 5: User can navigate back from Forum to Home
   */
  test('User can navigate back from Forum to Home', async () => {
    // Arrange: Go to forum
    await navbar.clickForum();
    await expect(navbar.getPage()).toHaveURL(/forum/);

    // Act: Go back to home via navbar
    await navbar.homeLink.click();

    // Assert: Should be back on home
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 6: Le forum général n'est pas accessible aux visiteurs non connectés
   */
  test('Un visiteur non connecté est redirigé vers la connexion depuis le forum général', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/forum/0');
    await expect(page).toHaveURL(/\/login/);
    await context.close();
  });

  /**
   * Test 6bis: L'API du forum général est réservée aux utilisateurs connectés
   */
  test('L\'API du forum général renvoie 401 pour un visiteur non connecté', async ({ request }) => {
    const response = await request.get('/api/forum');
    expect(response.status()).toBe(401);

    // L'aperçu des derniers sujets reste public pour la page d'accueil
    const recentResponse = await request.get('/api/forum/recent-topics?limit=5');
    expect(recentResponse.ok()).toBeTruthy();
  });

  /**
   * Test 7: Le bouton "Nouveau sujet" est réservé aux administrateurs
   * Un utilisateur standard (non admin) ne voit pas le bouton
   */
  test('Bouton "Nouveau sujet" invisible pour un utilisateur non administrateur', async ({ page }) => {
    // Arrange : le beforeEach a authentifié un utilisateur standard non administrateur

    // Act: Ouvrir le forum général
    await page.goto('/forum/0');
    await expect(page.locator('body')).toContainText(/forum|sujet|topic/i);

    // Assert: Le bouton "Nouveau sujet" n'est pas affiché
    await expect(page.locator('button', { hasText: 'Nouveau sujet' })).toHaveCount(0);
  });
});
