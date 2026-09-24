import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Homepage Tests
 * Tests for the home page content and functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Homepage', () => {
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
   * Test 1: Homepage loads successfully
   */
  test('Homepage loads successfully', async () => {
    // Assert: Page should load and hero section visible
    await expect(homePage.isOnPage()).resolves.toBeTruthy();
    await expect(homePage.heroTitle).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 2: Homepage has correct page title
   */
  test('Homepage has correct title', async ({ page }) => {
    // Wait a bit for title to be set
    await page.waitForTimeout(500);
    const title = await page.title();
    expect(title.toLowerCase()).toContain('jdroll');
  });

  /**
   * Test 3: Homepage displays hero section content
   */
  test('Homepage hero section has correct content', async () => {
    // Assert: Hero section content
    await expect(homePage.heroTitle).toContainText(/JdRoll/i);
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
    
    // Subtitle might be in different format
    const subtitleText = await homePage.heroSubtitle.textContent();
    expect(subtitleText?.toLowerCase()).toContain('jeu');
  });

  /**
   * Test 4: Homepage shows auth buttons for unauthenticated user
   */
  test('Homepage shows login and register buttons for unauthenticated user', async () => {
    // Assert: Auth buttons should be visible
    await expect(navbar.loginButton).toBeVisible({ timeout: 5000 });
    await expect(navbar.registerButton).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: Homepage displays all content sections
   */
  test('Homepage displays all main content sections', async () => {
    // Assert: All sections should be visible
    await expect(homePage.communitySection).toBeVisible({ timeout: 5000 });
    await expect(homePage.choiceSection).toBeVisible({ timeout: 5000 });
    await expect(homePage.platformSection).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 6: Community section has correct content
   */
  test('Community section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.communitySection.textContent();
    expect(sectionText?.toLowerCase()).toContain('communauté');
  });

  /**
   * Test 7: Choice section has correct content
   */
  test('Choice section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.choiceSection.textContent();
    expect(sectionText?.toLowerCase()).toContain('choix');
  });

  /**
   * Test 8: Platform section has correct content
   */
  test('Platform section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.platformSection.textContent();
    expect(sectionText?.toLowerCase()).toContain('plateforme');
  });

  /**
   * Test 9: All quick access cards are visible
   */
  test('All quick access cards are visible and clickable', async () => {
    // Assert: All cards visible
    await expect(homePage.myCampaignsCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.createCampaignCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.joinCampaignCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.forumCard).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 10: Quick access cards have correct labels
   */
  test('Quick access cards have correct labels', async () => {
    // Assert: Card labels
    const myCampaignsText = await homePage.myCampaignsCard.textContent();
    expect(myCampaignsText?.toLowerCase()).toContain('campagne');
    
    const createText = await homePage.createCampaignCard.textContent();
    expect(createText?.toLowerCase()).toContain('créer');
    
    const joinText = await homePage.joinCampaignCard.textContent();
    expect(joinText?.toLowerCase()).toContain('rejoindre');
    
    const forumText = await homePage.forumCard.textContent();
    expect(forumText?.toLowerCase()).toContain('forum');
  });

  /**
   * Test 11: Homepage is responsive
   */
  test('Homepage adapts to different screen sizes', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 12: Homepage layout is consistent
   */
  test('Homepage has consistent layout structure', async ({ page }) => {
    // Assert: Main container exists - simple check
    await expect(page.locator('main')).toHaveCount(1);
    // Check that hero title is visible (basic layout check)
    await expect(homePage.heroTitle).toBeVisible();
  });
});
