import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Forum Tests
 * Tests for forum-related functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Forum', () => {
  let homePage: HomePage;
  let navbar: Navbar;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);
    
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
   * Test 6: Le bouton "Nouveau sujet" est réservé aux administrateurs
   * Un visiteur non connecté ne voit pas le bouton
   */
  test('Bouton "Nouveau sujet" invisible pour un visiteur non connecté', async ({ page }) => {
    await page.goto('/forum/0');
    await expect(page.locator('button', { hasText: 'Nouveau sujet' })).toHaveCount(0);
  });

  /**
   * Test 7: Le bouton "Nouveau sujet" est réservé aux administrateurs
   * Un utilisateur standard (non admin) ne voit pas le bouton
   */
  test('Bouton "Nouveau sujet" invisible pour un utilisateur non administrateur', async ({ page, request }) => {
    // Arrange: Créer un utilisateur standard via l'API
    const username = `forum_std_${Date.now()}`;
    const res = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password: 'password123',
        website: '',
        elapsedMs: 10000,
      },
    });
    expect(res.status()).toBe(201);

    // Act: Se connecter puis ouvrir le forum général
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(username, 'password123');
    await page.goto('/forum/0');
    await expect(page.locator('body')).toContainText(/forum|sujet|topic/i);

    // Assert: Le bouton "Nouveau sujet" n'est pas affiché
    await expect(page.locator('button', { hasText: 'Nouveau sujet' })).toHaveCount(0);
  });
});
