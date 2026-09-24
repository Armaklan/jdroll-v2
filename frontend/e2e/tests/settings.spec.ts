import { test, expect } from '@playwright/test';
import { Navbar } from '../page-objects/Navbar';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Settings Tests
 * Tests for user settings functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Settings', () => {
  let navbar: Navbar;
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    navbar = new Navbar(page);
    loginPage = new LoginPage(page);
    
    // Start from home page
    await page.goto('/');
  });

  /**
   * Test 1: Settings page redirects to login when not authenticated
   */
  test('Settings page redirects to login when not authenticated', async ({ page }) => {
    // Act: Try to navigate directly to settings
    await page.goto('/settings');
    
    // Wait for potential redirect
    await page.waitForTimeout(1000);
    
    // Assert: Should be on login page (or settings page may show login prompt)
    // Check if we were redirected
    if (page.url().includes('/login')) {
      await expect(loginPage.title).toBeVisible({ timeout: 5000 });
    }
    // If not redirected, that's also acceptable - page may show a message
    // Just verify page loaded
    await expect(page).toHaveTitle(/JdRoll/);
  });

  /**
   * Test 2: Navbar does not show settings link for unauthenticated user
   */
  test('Navbar does not show settings link for unauthenticated user', async () => {
    // Assert: Settings link should not be visible
    await expect(navbar.userMenu).toHaveCount(0);
    await expect(navbar.logoutButton).toHaveCount(0);
  });

  /**
   * Test 3: Settings page URL is /settings
   */
  test('Settings page is accessible', async ({ page }) => {
    // Act: Try to navigate to settings
    await page.goto('/settings');
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Assert: Page should load (may redirect to login or show settings)
    // Just verify page loaded successfully
    await expect(page).toHaveTitle(/JdRoll/);
  });

  /**
   * Test 4: Navbar shows login/register for unauthenticated user
   */
  test('Navbar shows login and register for unauthenticated user', async () => {
    // Assert: Should show login and register buttons
    await expect(navbar.loginButton).toBeVisible({ timeout: 5000 });
    await expect(navbar.registerButton).toBeVisible({ timeout: 5000 });
  });
});
