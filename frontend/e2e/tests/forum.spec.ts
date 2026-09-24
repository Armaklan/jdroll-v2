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
   * Test 2: User can navigate to Forum from home quick access
   */
  test('User can navigate to Forum from home quick access card', async () => {
    // Act: Click on Forum card
    await homePage.clickForumCard();
    
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
});
