import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Reset Password page (/reset-password?user=X&alea=Y)
 */
export class ResetPasswordPage extends BasePage {
  readonly title: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly invalidLinkMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.title = page.getByRole('heading', { name: /Nouveau mot de passe/i, level: 2 });
    this.newPasswordInput = page.locator('input[type="password"]').nth(0);
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.submitButton = page.getByRole('button', { name: /Définir mon nouveau mot de passe/i });
    this.successMessage = page.getByText(/Mot de passe mis à jour avec succès/i);
    this.errorMessage = page.locator('.bg-red-50').filter({ hasText: /.+/ });
    this.invalidLinkMessage = page.getByText(/incomplet ou invalide/i);
  }

  /**
   * Navigate to the reset password page with its full link (from the email)
   */
  async navigate(resetUrl?: string): Promise<void> {
    await this.page.goto(resetUrl || '/reset-password');
    await this.waitForLoad();
  }

  /**
   * Fill and submit the new password form
   */
  async setNewPassword(newPassword: string, confirmPassword?: string): Promise<void> {
    await this.fill(this.newPasswordInput, newPassword);
    await this.fill(this.confirmPasswordInput, confirmPassword ?? newPassword);
    await this.submitButton.click();
  }

  /**
   * Check if we are on the reset password page
   */
  async isOnPage(): Promise<boolean> {
    try {
      await this.title.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
