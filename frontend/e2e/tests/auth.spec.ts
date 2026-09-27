import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Authentication Tests
 * Tests for login, registration, and logout functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Authentication Flow', () => {
  let homePage: HomePage;
  let loginPage: LoginPage;
  let registerPage: RegisterPage;
  let navbar: Navbar;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    homePage = new HomePage(page);
    loginPage = new LoginPage(page);
    registerPage = new RegisterPage(page);
    navbar = new Navbar(page);
    
    // Start from home page
    await homePage.navigate();
  });

  test.afterEach(async ({ page }) => {
    // Always return to home page to ensure clean state
    try {
      await page.goto('/');
      await homePage.waitForLoad();
    } catch {
      // Ignore errors
    }
  });

  /**
   * Test 1: User can navigate to login page from home
   */
  test('User can navigate to login page from home', async () => {
    // Act: Click on login button in navbar
    await navbar.clickLogin();
    
    // Assert: Should be on login page
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    await expect(loginPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 2: User can navigate to register page from home
   */
  test('User can navigate to register page from home', async () => {
    // Act: Click on register button in navbar
    await navbar.clickRegister();
    
    // Assert: Should be on register page
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    await expect(registerPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 3: User can navigate to register page from login page
   */
  test('User can navigate to register page from login page', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    
    // Act: Click on "Create account" link
    await loginPage.goToRegister();
    
    // Assert: Should be on register page
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    await expect(registerPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 4: User can navigate to login page from register page
   */
  test('User can navigate to login page from register page', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    
    // Act: Click on "Login" link
    await registerPage.goToLogin();
    
    // Assert: Should be on login page
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    await expect(loginPage.title).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: Login form has required fields
   */
  test('Login form has required fields', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    
    // Assert: Check that form inputs exist
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 3000 });
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 3000 });
    await expect(loginPage.loginButton).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 5b: Remember me checkbox is visible, unchecked by default and toggleable
   */
  test('Login form displays a "Se souvenir de moi" checkbox unchecked by default', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();

    // Assert: Checkbox is visible and unchecked by default
    await expect(loginPage.rememberMeCheckbox).toBeVisible({ timeout: 3000 });
    await expect(loginPage.rememberMeCheckbox).not.toBeChecked();

    // Act: Check the checkbox
    await loginPage.rememberMeCheckbox.check();

    // Assert: Checkbox is checked
    await expect(loginPage.rememberMeCheckbox).toBeChecked();
  });

  /**
   * Test 5c: Login without "Se souvenir de moi" stores the token in localStorage, not in a cookie
   */
  test('Login without remember me stores token in localStorage only', async ({ page, request }) => {
    // Arrange: Create a unique test user via the API
    const suffix = Date.now();
    const username = `e2e_remember_${suffix}`;
    const password = 'Password123!';
    await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password,
        elapsedMs: 5000,
      },
    });

    // Act: Login with the checkbox unchecked
    await navbar.clickLogin();
    await loginPage.fillLoginForm(username, password);
    await loginPage.submit();
    await page.waitForTimeout(1500);

    // Assert: Token is in localStorage, not in a cookie
    const localStorageToken = await page.evaluate(() => localStorage.getItem('jdroll_token'));
    const hasCookieToken = await page.evaluate(() =>
      document.cookie.split(';').some((c) => c.trim().startsWith('jdroll_token='))
    );
    expect(localStorageToken).toBeTruthy();
    expect(hasCookieToken).toBe(false);
  });

  /**
   * Test 5d: Login with "Se souvenir de moi" stores the token in a cookie, not in localStorage
   */
  test('Login with remember me checked stores token in a cookie only', async ({ page, request }) => {
    // Arrange: Create a unique test user via the API
    const suffix = Date.now();
    const username = `e2e_remember_${suffix}`;
    const password = 'Password123!';
    await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password,
        elapsedMs: 5000,
      },
    });

    // Act: Login with the checkbox checked
    await navbar.clickLogin();
    await loginPage.fillLoginForm(username, password);
    await loginPage.rememberMeCheckbox.check();
    await loginPage.submit();
    await page.waitForTimeout(1500);

    // Assert: Token is in a cookie, not in localStorage
    const localStorageToken = await page.evaluate(() => localStorage.getItem('jdroll_token'));
    const cookieToken = await page.evaluate(() => {
      const match = document.cookie.split(';').find((c) => c.trim().startsWith('jdroll_token='));
      return match ? match.trim().split('=').slice(1).join('=') : null;
    });
    expect(cookieToken).toBeTruthy();
    expect(localStorageToken).toBeNull();
  });

  /**
   * Test 6: Register form has required fields
   */
  test('Register form has required fields', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    
    // Assert: Check that form inputs exist
    await expect(registerPage.usernameInput).toBeVisible({ timeout: 3000 });
    await expect(registerPage.emailInput).toBeVisible({ timeout: 3000 });
    await expect(registerPage.passwordInput).toBeVisible({ timeout: 3000 });
    await expect(registerPage.registerButton).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 7: Login page displays correct title
   */
  test('Login page displays correct title', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    
    // Assert: Verify title
    await expect(loginPage.title).toHaveText(/Connexion/i);
  });

  /**
   * Test 8: Register page displays correct title
   */
  test('Register page displays correct title', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    
    // Assert: Verify title
    await expect(registerPage.title).toHaveText(/Inscription/i);
  });

  /**
   * Test 9: User can fill login form
   */
  test('User can fill login form with credentials', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.isOnPage()).resolves.toBeTruthy();
    
    const testCredentials = {
      username: 'testuser@example.com',
      password: 'TestPassword123!',
    };
    
    // Act: Fill the form
    await loginPage.fillLoginForm(testCredentials.username, testCredentials.password);
    
    // Assert: Form should have the values
    expect(await loginPage.getUsername()).toBe(testCredentials.username);
    expect(await loginPage.getPassword()).toBe(testCredentials.password);
  });

  /**
   * Test 10: User can fill register form
   */
  test('User can fill register form with credentials', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.isOnPage()).resolves.toBeTruthy();
    
    const testUser = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'NewPassword123!',
    };
    
    // Act: Fill the form
    await registerPage.fillRegisterForm(testUser.username, testUser.email, testUser.password);
    
    // Assert: Form should have the values
    const formValues = await registerPage.getFormValues();
    expect(formValues.username).toBe(testUser.username);
    expect(formValues.email).toBe(testUser.email);
    expect(formValues.password).toBe(testUser.password);
  });

  /**
   * Test 11: Login form inputs have proper placeholders
   */
  test('Login form inputs have proper placeholder text', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 3000 });
    
    // Assert: Check placeholders
    const usernamePlaceholder = await loginPage.usernameInput.getAttribute('placeholder');
    const passwordPlaceholder = await loginPage.passwordInput.getAttribute('placeholder');
    
    expect(usernamePlaceholder?.toLowerCase()).toContain('pseudo');
    expect(passwordPlaceholder).toBe('••••••••');
  });

  /**
   * Test 12: Register form inputs have proper placeholders
   */
  test('Register form inputs have proper placeholder text', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.usernameInput).toBeVisible({ timeout: 3000 });
    
    // Assert: Check placeholders
    const usernamePlaceholder = await registerPage.usernameInput.getAttribute('placeholder');
    const emailPlaceholder = await registerPage.emailInput.getAttribute('placeholder');
    const passwordPlaceholder = await registerPage.passwordInput.getAttribute('placeholder');
    
    expect(usernamePlaceholder?.toLowerCase()).toContain('pseudo');
    expect(emailPlaceholder?.toLowerCase()).toContain('email');
    expect(passwordPlaceholder).toBe('••••••••');
  });

  /**
   * Test 13: Login button exists and is clickable
   */
  test('Login button exists and is clickable', async () => {
    // Arrange: Go to login page
    await navbar.clickLogin();
    await expect(loginPage.loginButton).toBeVisible({ timeout: 3000 });
    
    // Assert: Button is enabled (not disabled)
    const isDisabled = await loginPage.loginButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
  });

  /**
   * Test 14: Register button exists and is clickable
   */
  test('Register button exists and is clickable', async () => {
    // Arrange: Go to register page
    await navbar.clickRegister();
    await expect(registerPage.registerButton).toBeVisible({ timeout: 3000 });
    
    // Assert: Button is enabled (not disabled)
    const isDisabled = await registerPage.registerButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
  });

  /**
   * Test 15: User can clear login form
   */
  test('User can clear login form', async () => {
    // Arrange: Go to login page and fill form
    await navbar.clickLogin();
    await loginPage.fillLoginForm('test@example.com', 'password123');
    
    // Act: Clear form
    await loginPage.clearForm();
    
    // Assert: Form should be empty
    expect(await loginPage.getUsername()).toBe('');
    expect(await loginPage.getPassword()).toBe('');
  });
});
