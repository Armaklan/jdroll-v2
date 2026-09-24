import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Chat Tests
 * Tests for chat-related functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Chat', () => {
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
   * Test 1: User can navigate to Chat from navbar
   */
  test('User can navigate to Chat from navbar', async () => {
    // Act: Click on Chat link
    await navbar.clickChat();
    
    // Assert: URL should be /chat or login
    await expect(navbar.getPage()).toHaveURL(/chat|login/);
  });

  /**
   * Test 2: Chat page is accessible
   */
  test('Chat page is accessible', async () => {
    // Act: Navigate to chat
    await navbar.clickChat();
    
    // Assert: URL should be /chat or login
    await expect(navbar.getPage()).toHaveURL(/chat|login/);
    
    // If we're on chat page (authenticated), check for chat content
    if (navbar.getPage().url().includes('/chat')) {
      await expect(navbar.getPage().locator('body')).toContainText(/chat|tchat|message/i);
    }
  });

  /**
   * Test 3: Chat page is accessible directly
   */
  test('Chat page is accessible directly via URL', async ({ page }) => {
    // Act: Navigate directly to chat
    await page.goto('/chat');
    
    // Assert: URL should be /chat or login
    await expect(page).toHaveURL(/chat|login/);
  });

  /**
   * Test 4: User can navigate back from Chat to Home
   */
  test('User can navigate back from Chat to Home', async ({ page }) => {
    // Arrange: Go to chat or login
    await navbar.clickChat();
    
    // Act: Go back to home
    await page.goBack();
    
    // Assert: Should be back on home
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
  });
});
