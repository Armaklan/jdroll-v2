import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Login page
 * Provides methods to interact with the login form
 */
export class LoginPage extends BasePage {
  // Selectors - using getByRole and more flexible selectors
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly switchToRegisterLink: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    super(page);
    
    // Use getByRole for better reliability
    this.title = page.getByRole('heading', { name: /Connexion/i, level: 2 });
    this.subtitle = page.getByText(/Accédez à votre compte JdRoll/i);
    // Try multiple approaches: by placeholder, by role, by type
    this.usernameInput = page.getByPlaceholder(/Pseudo|adresse email|Identifiant|Email/i).or(
      page.getByRole('textbox', { name: /Identifiant|Pseudo|Email/i })
    ).or(page.locator('input[type="text"], input[type="email"]'));
    this.passwordInput = page.getByPlaceholder(/Mot de passe/i).or(
      page.getByRole('textbox', { name: /Mot de passe/i })
    ).or(page.locator('input[type="password"]'));
    this.loginButton = page.getByRole('button', { name: /Se connecter|Connexion/i });
    this.errorMessage = page.locator('.bg-red-50, .border-red-200, .text-red-700').filter({ hasText: /Erreur|Error/i });
    this.loadingSpinner = page.locator('.animate-spin:visible');
    this.switchToRegisterLink = page.getByRole('button', { name: /Créer un compte/i });
    this.form = page.locator('form');
  }

  /**
   * Navigate to the login page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForLoad();
  }

  /**
   * Fill the login form with username and password
   */
  async fillLoginForm(username: string, password: string): Promise<void> {
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
  }

  /**
   * Submit the login form
   */
  async submit(): Promise<void> {
    await this.loginButton.click();
    // Wait for any potential loading or navigation
    await this.page.waitForTimeout(1000);
  }

  /**
   * Login with provided credentials
   */
  async login(username: string, password: string): Promise<void> {
    await this.fillLoginForm(username, password);
    await this.submit();
    // For successful login, we may be redirected to home or dashboard
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if login button is disabled (loading state)
   */
  async isLoading(): Promise<boolean> {
    const disabled = await this.loginButton.getAttribute('disabled');
    const hasSpinner = await this.loadingSpinner.count() > 0;
    return disabled !== null || hasSpinner;
  }

  /**
   * Get the error message if login failed
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
   * Click the "Create account" link to go to register page
   */
  async goToRegister(): Promise<void> {
    await this.switchToRegisterLink.click();
    await this.page.waitForURL(/\/register/);
  }

  /**
   * Verify that we are on the login page
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
   * Clear the login form
   */
  async clearForm(): Promise<void> {
    await this.usernameInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Get the username value
   */
  async getUsername(): Promise<string> {
    return await this.usernameInput.inputValue();
  }

  /**
   * Get the password value (masked)
   */
  async getPassword(): Promise<string> {
    return await this.passwordInput.inputValue();
  }
}
