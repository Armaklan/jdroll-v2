import { test, expect } from '@playwright/test';
import { 
  HomePage, 
  Navbar, 
  LoginPage, 
  RegisterPage,
  CampaignFormPage 
} from '../page-objects';

/**
 * Example Tests
 * This file demonstrates how to use the PageObject pattern with Playwright
 */

test.describe('PageObject Pattern Examples', () => {
  let homePage: HomePage;
  let navbar: Navbar;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let campaignFormPage: CampaignFormPage;

  test.beforeEach(async ({ page }) => {
    // Initialize all Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    campaignFormPage = new CampaignFormPage(page);
    
    // Start from a clean state
    await homePage.navigate();
  });

  /**
   * Example 1: Simple navigation test
   */
  test('Example: User can navigate to login page', async () => {
    // Act: Use the Navbar PageObject to click login
    await navbar.clickLogin();
    
    // Assert: Use the LoginPage PageObject to verify we're on the page
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    await expect(loginPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Example 2: Form interaction test
   */
  test('Example: User can fill login form', async () => {
    // Arrange: Navigate to login page
    await navbar.clickLogin();
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    
    // Act: Use LoginPage methods to fill the form
    const credentials = {
      username: 'testuser@example.com',
      password: 'SecurePassword123!',
    };
    await loginPage.fillLoginForm(credentials.username, credentials.password);
    
    // Assert: Form should have the values
    expect(await loginPage.getUsername()).toBe(credentials.username);
    expect(await loginPage.getPassword()).toBe(credentials.password);
  });

  /**
   * Example 3: Multi-page workflow
   */
  test('Example: User can navigate from home to register to login', async () => {
    // Act: Navigate from home to register
    await navbar.clickRegister();
    
    // Assert: On register page
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    
    // Act: Go to login from register page
    await registerPage.goToLogin();
    
    // Assert: On login page
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    
    // Act: Go back home
    await navbar.homeLink.click();
    await navbar.waitForNavigation();
    
    // Assert: Back on home page
    await expect(homePage.isOnPage()).resolves.toBeTruthy();
  });

  /**
   * Example 4: Form filling workflow
   */
  test('Example: User can fill and clear campaign form', async ({ page }) => {
    // Navigate to create campaign
    await page.goto('/campaigns/new');
    
    // Wait for navigation to complete
    await page.waitForTimeout(1000);
    
    // Check if we're redirected to login
    if (page.url().includes('/login')) {
      // That's expected for unauthenticated users
      await expect(loginPage.title).toBeVisible({ timeout: 5000 });
    } else {
      // We're on the form page
      await expect(campaignFormPage.isOnPage()).resolves.toBeTruthy();
      
      const campaignData = {
        name: 'My Awesome Campaign',
        description: 'A campaign about adventures',
      };
      
      // Act: Fill the form
      await campaignFormPage.fillForm(campaignData);
      
      // Assert: Form has the values
      const formValues = await campaignFormPage.getFormValues();
      expect(formValues.name).toBe(campaignData.name);
      expect(formValues.description).toBe(campaignData.description);
      
      // Act: Clear the form
      await campaignFormPage.clearForm();
      
      // Assert: Form is empty
      const clearedValues = await campaignFormPage.getFormValues();
      expect(clearedValues.name).toBe('');
      expect(clearedValues.description).toBe('');
    }
  });

  /**
   * Example 5: Testing page content
   */
  test('Example: Home page displays expected content', async () => {
    // Assert: Hero section is displayed
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
    
    // Assert: All quick access cards are visible
    await expect(homePage.areQuickAccessCardsVisible()).resolves.toBeTruthy();
    
    // Assert: Navbar is displayed
    await expect(navbar.logo).toBeVisible({ timeout: 3000 });
  });

  /**
   * Example 6: Testing form validation
   */
  test('Example: Register form fields exist', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    
    // Assert: All fields exist
    await expect(registerPage.usernameInput).toBeVisible({ timeout: 3000 });
    await expect(registerPage.emailInput).toBeVisible({ timeout: 3000 });
    await expect(registerPage.passwordInput).toBeVisible({ timeout: 3000 });
  });
});
