import { test, expect, devices } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';

/**
 * Mobile Navigation Tests
 * Tests for mobile-specific navigation functionality
 * Uses PageObject pattern and Playwright's device emulation
 */

test.use(devices['iPhone 12']);

test.describe('Mobile Navigation', () => {
  let homePage: HomePage;
  let navbar: Navbar;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    
    // Start from home page
    await homePage.navigate();
  });

  /**
   * Test 1: Mobile menu button is visible on small screens
   */
  test('Mobile menu button is visible on mobile viewport', async () => {
    // Assert: Mobile menu button should be visible
    await expect(navbar.mobileMenuButton).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 2: User can open mobile menu
   */
  test('User can open mobile menu', async () => {
    // Act: Open mobile menu
    await navbar.openMobileMenu();
    
    // Assert: Mobile menu should be open - check for mobile-specific elements
    await expect(navbar.getPage().getByRole('link', { name: /Accueil/i })).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 3: Mobile menu contains navigation links
   */
  test('Mobile menu contains all navigation links', async () => {
    // Arrange: Open mobile menu
    await navbar.openMobileMenu();
    
    // Assert: All links should be visible in mobile menu
    await expect(navbar.getPage().getByRole('link', { name: /Accueil/i })).toBeVisible({ timeout: 3000 });
    await expect(navbar.getPage().getByRole('link', { name: /Campagnes|Jouer/i })).toBeVisible({ timeout: 3000 });
    await expect(navbar.getPage().getByRole('link', { name: /Forum/i })).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 4: User can navigate from mobile menu
   */
  test('User can navigate to Login from mobile menu', async () => {
    // Arrange: Open mobile menu
    await navbar.openMobileMenu();
    
    // Act: Click login link in mobile menu
    await navbar.getPage().getByRole('link', { name: /Connexion/i }).click();
    
    // Assert: Should be on login page
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    await expect(loginPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: User can navigate to Register from mobile menu
   */
  test('User can navigate to Register from mobile menu', async () => {
    // Arrange: Open mobile menu
    await navbar.openMobileMenu();
    
    // Act: Click register link in mobile menu
    await navbar.getPage().getByRole('link', { name: /Inscription/i }).click();
    
    // Assert: Should be on register page
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    await expect(registerPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 6: Home page hero section is responsive on mobile
   */
  test('Home page hero section is responsive on mobile', async () => {
    // Assert: Hero section should adapt to mobile
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
    
    // Check that the font size is reasonable on mobile
    const fontSize = await homePage.heroTitle.evaluate(el => {
      // @ts-ignore - window is available in browser context
      return window.getComputedStyle(el).fontSize;
    });
    expect(fontSize).toBeTruthy();
  });

  /**
   * Test 7: Form inputs are accessible on mobile
   */
  test('Login form is accessible on mobile', async ({ page }) => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    // Wait for page to load
    await page.waitForTimeout(2000);
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 5000 });
    
    // Assert: Form inputs should be large enough for touch
    const inputHeight = await loginPage.usernameInput.evaluate(el => {
      // @ts-ignore - window is available in browser context
      return parseInt(window.getComputedStyle(el).height);
    });
    expect(inputHeight).toBeGreaterThanOrEqual(35);
  });

  /**
   * Test 8: Register form is accessible on mobile
   */
  test('Register form is accessible on mobile', async ({ page }) => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    // Wait for page to load
    await page.waitForTimeout(2000);
    await expect(registerPage.usernameInput).toBeVisible({ timeout: 5000 });
    
    // Assert: Form inputs should be large enough for touch
    const inputs = [
      registerPage.usernameInput,
      registerPage.emailInput,
      registerPage.passwordInput,
    ];
    
    for (const input of inputs) {
      const height = await input.evaluate(el => {
        // @ts-ignore - window is available in browser context
        return parseInt(window.getComputedStyle(el).height);
      });
      expect(height, `Input is too small`).toBeGreaterThanOrEqual(35);
    }
  });

  /**
   * Test 9: Buttons are large enough for touch on mobile
   */
  test('Buttons are large enough for touch on mobile', async ({ page }) => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    // Wait for page to load
    await page.waitForTimeout(2000);
    await expect(loginPage.loginButton).toBeVisible({ timeout: 5000 });
    
    // Assert: Buttons should have adequate touch targets
    const buttonHeight = await loginPage.loginButton.evaluate(el => {
      // @ts-ignore - window is available in browser context
      return parseInt(window.getComputedStyle(el).height);
    });
    const buttonWidth = await loginPage.loginButton.evaluate(el => {
      // @ts-ignore - window is available in browser context
      return parseInt(window.getComputedStyle(el).width);
    });
    
    expect(buttonHeight, 'Button height is too small').toBeGreaterThanOrEqual(40);
    expect(buttonWidth, 'Button width is too small').toBeGreaterThanOrEqual(100);
  });
});
