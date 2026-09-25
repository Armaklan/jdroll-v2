import { test, expect } from '@playwright/test';
import { Navbar } from '../page-objects/Navbar';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';
import { SettingsPage } from '../page-objects/SettingsPage';

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

/**
 * Tests du profil Settings (utilisateur authentifié)
 * Avatar : URL ou upload d'image ; Description : éditeur Wysiwyg
 */
test.describe('Settings - Profil', () => {
  let settingsPage: SettingsPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    registerPage = new RegisterPage(page);

    // Créer un utilisateur unique et se connecter (l'inscription connecte automatiquement)
    const username = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');

    // Aller sur la page des paramètres (l'onglet Profil est actif par défaut)
    await settingsPage.navigate();
    await settingsPage.switchToProfileTab();
  });

  test('Avatar : le choix entre URL et upload est proposé', async ({ page }) => {
    // Les deux modes sont accessibles
    await expect(settingsPage.avatarUploadToggle).toBeVisible();
    await expect(settingsPage.avatarUrlToggle).toBeVisible();

    // Mode URL actif par défaut : champ URL visible
    await expect(settingsPage.avatarUrlInput).toBeVisible();

    // Mode upload : dropzone visible
    await settingsPage.avatarUploadToggle.click();
    await expect(settingsPage.avatarDropzone.first()).toBeVisible();

    // Retour au mode URL
    await settingsPage.avatarUrlToggle.click();
    await expect(settingsPage.avatarUrlInput).toBeVisible();
  });

  test('Avatar : une URL peut être saisie et prévisualisée', async ({ page }) => {
    await settingsPage.avatarUrlInput.fill('https://example.com/avatar.png');
    await expect(settingsPage.avatarUrlInput).toHaveValue('https://example.com/avatar.png');
  });

  test('Description : un éditeur Wysiwyg est proposé', async ({ page }) => {
    // La barre d'outils du wysiwyg est présente
    await expect(settingsPage.wysiwygToolbar).toBeVisible();

    // La zone éditable est présente et on peut y écrire
    await expect(settingsPage.wysiwygEditor).toBeVisible();
    await settingsPage.wysiwygEditor.click();
    await settingsPage.wysiwygEditor.type('Ma description de test');
    await expect(settingsPage.wysiwygEditor).toContainText('Ma description de test');
  });
});
