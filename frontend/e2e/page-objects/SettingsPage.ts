import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Settings page
 * Provides methods to interact with user settings
 */
export class SettingsPage extends BasePage {
  // Selectors
  readonly title: Locator;
  readonly profileTab: Locator;
  readonly notificationsTab: Locator;
  readonly passwordTab: Locator;
  readonly saveButton: Locator;
  readonly form: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    this.title = page.locator('h1:text-is("Paramètres")');
    this.profileTab = page.locator('button:text("Profil")');
    this.notificationsTab = page.locator('button:text("Notifications")');
    this.passwordTab = page.locator('button:text("Mot de passe")');
    this.saveButton = page.locator('button[type="submit"]');
    this.form = page.locator('form');
    this.successMessage = page.locator('.bg-green-50.border.border-green-200:visible');
    this.errorMessage = page.locator('.bg-red-50.border.border-red-200:visible');
  }

  /**
   * Navigate to the settings page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/settings');
    await this.waitForLoad();
  }

  /**
   * Verify that we are on the settings page
   */
  async isOnPage(): Promise<boolean> {
    return await this.title.count() > 0;
  }

  /**
   * Switch to profile tab
   */
  async switchToProfileTab(): Promise<void> {
    await this.profileTab.click();
  }

  /**
   * Switch to notifications tab
   */
  async switchToNotificationsTab(): Promise<void> {
    await this.notificationsTab.click();
  }

  /**
   * Switch to password tab
   */
  async switchToPasswordTab(): Promise<void> {
    await this.passwordTab.click();
  }

  /**
   * Check if a tab is active
   */
  async isTabActive(tab: 'profile' | 'notifications' | 'password'): Promise<boolean> {
    let tabLocator: Locator;
    switch (tab) {
      case 'profile':
        tabLocator = this.profileTab;
        break;
      case 'notifications':
        tabLocator = this.notificationsTab;
        break;
      case 'password':
        tabLocator = this.passwordTab;
        break;
      default:
        throw new Error(`Unknown tab: ${tab}`);
    }
    
    return await tabLocator.getAttribute('aria-selected') === 'true' ||
           await tabLocator.getAttribute('data-active') === 'true' ||
           (await tabLocator.count() > 0);
  }

  /**
   * Check if form was submitted successfully
   */
  async hasSuccessMessage(): Promise<boolean> {
    return await this.successMessage.count() > 0;
  }

  /**
   * Check if there's an error
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.count() > 0;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.count() > 0) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Submit the settings form
   */
  async submit(): Promise<void> {
    await this.saveButton.click();
  }
}
