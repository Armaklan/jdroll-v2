import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Register page
 * Provides methods to interact with the registration form
 */
export class RegisterPage extends BasePage {
  // Selectors
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly switchToLoginLink: Locator;
  readonly form: Locator;
  readonly honeypotInput: Locator;

  private formStartTime: number | null = null;

  constructor(page: Page) {
    super(page);
    
    this.title = page.getByRole('heading', { name: /Inscription/i, level: 2 });
    this.subtitle = page.getByText(/Créez votre compte|rejoindre l'aventure/i);
    // Use the actual placeholder values from the page
    this.usernameInput = page.getByPlaceholder('MonPseudo').or(
      page.getByRole('textbox', { name: /Identifiant|Pseudo/i })
    ).or(page.locator('[name="username"]'));
    this.emailInput = page.getByPlaceholder('mon.email@example.com').or(
      page.getByRole('textbox', { name: /Adresse Email|Email/i })
    ).or(page.locator('[name="email"]'));
    this.passwordInput = page.getByPlaceholder('••••••••').or(
      page.getByRole('textbox', { name: /Mot de passe/i })
    ).or(page.locator('[name="password"]'));
    this.registerButton = page.getByRole('button', { name: /S'inscrire/i });
    this.errorMessage = page.locator('.bg-red-50, .border-red-200, .text-red-700').filter({ hasText: /Erreur|Error/i });
    this.loadingSpinner = page.locator('.animate-spin:visible');
    this.switchToLoginLink = page.getByRole('button', { name: /Se connecter/i });
    this.form = page.locator('form');
    this.honeypotInput = page.locator('[name="website"]');
  }

  /**
   * Navigate to the register page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/register');
    await this.waitForLoad();
  }

  /**
   * Fill the registration form
   */
  async fillRegisterForm(username: string, email: string, password: string): Promise<void> {
    this.formStartTime = Date.now();
    await this.fill(this.usernameInput, username);
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
  }

  /**
   * Submit the registration form
   * Garantit le temps de remplissage minimal exigé par l'antibot côté serveur
   */
  async submit(): Promise<void> {
    if (this.formStartTime !== null) {
      const elapsed = Date.now() - this.formStartTime;
      const remaining = 2000 - elapsed;
      if (remaining > 0) {
        await this.page.waitForTimeout(remaining);
      }
    }

    await this.registerButton.click();
    try {
      await this.page.waitForTimeout(1000);
    } catch {
      // No navigation happened, that's ok for form validation tests
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Register with provided credentials
   */
  async register(username: string, email: string, password: string): Promise<void> {
    await this.fillRegisterForm(username, email, password);
    await this.submit();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if registration is in progress
   */
  async isLoading(): Promise<boolean> {
    const disabled = await this.registerButton.getAttribute('disabled');
    const hasSpinner = await this.loadingSpinner.count() > 0;
    return disabled !== null || hasSpinner;
  }

  /**
   * Get the error message if registration failed
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.count() > 0) {
      return await this.getText(this.errorMessage);
    }
    return null;
  }

  /**
   * Check if error message is visible
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.count() > 0;
  }

  /**
   * Click the "Login" link to go to login page
   */
  async goToLogin(): Promise<void> {
    await this.switchToLoginLink.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify that we are on the register page
   */
  async isOnPage(): Promise<boolean> {
    try {
      await this.title.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      try {
        await this.form.waitFor({ state: 'visible', timeout: 1000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Clear the registration form
   */
  async clearForm(): Promise<void> {
    await this.usernameInput.clear();
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Get form values
   */
  async getFormValues(): Promise<{ username: string; email: string; password: string }> {
    return {
      username: await this.usernameInput.inputValue(),
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
    };
  }
}
