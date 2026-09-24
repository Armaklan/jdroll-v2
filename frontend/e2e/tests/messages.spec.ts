import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Messages Tests
 * Tests for messages-related functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Messages', () => {
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
   * Test 1: User can navigate to Messages from navbar
   */
  test('User can navigate to Messages from navbar', async () => {
    // Act: Click on Messages link
    await navbar.clickMessages();
    
    // Assert: URL should be /messages or login
    await expect(navbar.getPage()).toHaveURL(/messages|login/);
  });

  /**
   * Test 2: Messages page is accessible
   */
  test('Messages page is accessible', async () => {
    // Act: Navigate to messages
    await navbar.clickMessages();
    
    // Assert: URL should be /messages or login
    await expect(navbar.getPage()).toHaveURL(/messages|login/);
    
    // If we're on messages page (authenticated), check for messages content
    if (navbar.getPage().url().includes('/messages')) {
      await expect(navbar.getPage().locator('body')).toContainText(/message|messagerie/i);
    }
  });

  /**
   * Test 3: Messages page is accessible directly
   */
  test('Messages page is accessible directly via URL', async ({ page }) => {
    // Act: Navigate directly to messages
    await page.goto('/messages');
    
    // Assert: URL should be /messages or login
    await expect(page).toHaveURL(/messages|login/);
  });

  /**
   * Test 4: User can navigate back from Messages to Home
   */
  test('User can navigate back from Messages to Home', async ({ page }) => {
    // Arrange: Go to messages or login
    await navbar.clickMessages();
    
    // Act: Go back to home
    await page.goBack();
    
    // Assert: Should be back on home
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
  });
});
