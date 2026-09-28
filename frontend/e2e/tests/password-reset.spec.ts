import { test, expect } from '@playwright/test';
import { APIRequestContext } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { ResetPasswordPage } from '../page-objects/ResetPasswordPage';

/**
 * Tests E2E de la fonctionnalité "Mot de passe oublié"
 * Flow complet : demande de réinitialisation -> mail (Mailpit) -> nouveau mot de passe -> connexion
 */

const MAILPIT_API = 'http://localhost:8025/api/v1';

interface MailpitMessageSummary {
  ID: string;
  Subject: string;
  To: { Address: string; Name: string }[];
}

/**
 * Récupère le lien de réinitialisation envoyé par mail (via l'API de Mailpit)
 */
async function getResetLinkFromMail(request: APIRequestContext, toMail: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const listResponse = await request.get(`${MAILPIT_API}/messages`);
    const listData = await listResponse.json();

    const message = (listData.messages as MailpitMessageSummary[]).find(
      (m) =>
        m.Subject.toLowerCase().includes('mot de passe') &&
        m.To.some((recipient) => recipient.Address.toLowerCase() === toMail.toLowerCase())
    );

    if (message) {
      const detailResponse = await request.get(`${MAILPIT_API}/message/${message.ID}`);
      const detail = await detailResponse.json();
      const html = String(detail.HTML || '');
      // Le gabarit des mails échappe les & en &amp; dans les liens (HTML valide)
      const match = html.match(/https?:\/\/[^"'<\s]*\/reset-password\?user=\d+&(?:amp;)?alea=[0-9a-f]+/);
      if (match) {
        return match[0].replace(/&amp;/g, '&');
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Aucun mail de réinitialisation reçu pour ${toMail}`);
}

test.describe('Password Reset Flow', () => {
  let loginPage: LoginPage;
  let resetPasswordPage: ResetPasswordPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    resetPasswordPage = new ResetPasswordPage(page);
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    } catch {
      // Ignorer les erreurs
    }
  });

  /**
   * Test 1: La page de connexion propose un accès au formulaire "Mot de passe oublié"
   */
  test('User can open the "Mot de passe oublié" form from the login page', async ({ page }) => {
    await loginPage.navigate();
    await expect(loginPage.forgotPasswordLink).toBeVisible();

    await loginPage.goToForgotPassword();

    await expect(loginPage.forgotTitle).toBeVisible();
    await expect(loginPage.forgotSubmitButton).toBeVisible();

    await loginPage.backToLogin();
    await expect(loginPage.title).toBeVisible();
  });

  /**
   * Test 2: La demande affiche une confirmation identique que le compte existe ou non
   * (anti-énumération de comptes)
   */
  test('Forgot password request shows a generic confirmation even for unknown identifiers', async ({ page, request }) => {
    await loginPage.navigate();

    await loginPage.goToForgotPassword();
    await loginPage.requestPasswordReset(`inconnu_${Date.now()}@example.com`);

    await expect(loginPage.forgotSuccessMessage).toBeVisible();
  });

  /**
   * Test 3: Flow complet - demande, mail avec lien, nouveau mot de passe, connexion
   */
  test('User can reset their password end-to-end and log in with the new password', async ({ page, request }) => {
    // Arrange: Créer un utilisateur de test via l'API
    const suffix = Date.now();
    const username = `e2e_pr_${suffix}`;
    const mail = `${username}@example.com`;
    const oldPassword = 'OldPassword123!';
    const newPassword = 'NewPassword456!';

    const registerResponse = await request.post('/api/auth/register', {
      data: {
        username,
        mail,
        password: oldPassword,
        elapsedMs: 5000,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    // Act 1: Demander la réinitialisation depuis la page de connexion
    await loginPage.navigate();
    await loginPage.goToForgotPassword();
    await loginPage.requestPasswordReset(username);
    await expect(loginPage.forgotSuccessMessage).toBeVisible();

    // Act 2: Récupérer le lien dans le mail reçu
    const resetUrl = await getResetLinkFromMail(request, mail);
    expect(resetUrl).toMatch(/\/reset-password\?user=\d+&alea=[0-9a-f]+$/);

    // Act 3: Ouvrir le lien et définir le nouveau mot de passe
    await resetPasswordPage.navigate(resetUrl);
    await expect(resetPasswordPage.title).toBeVisible();
    await resetPasswordPage.setNewPassword(newPassword);
    await expect(resetPasswordPage.successMessage).toBeVisible({ timeout: 10000 });

    // Assert: Redirection vers la page de connexion
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Act 4: Se connecter avec le nouveau mot de passe
    await loginPage.fillLoginForm(username, newPassword);
    await loginPage.submit();
    await page.waitForTimeout(1500);

    const localStorageToken = await page.evaluate(() => localStorage.getItem('jdroll_token'));
    expect(localStorageToken).toBeTruthy();

    // Assert: L'ancien mot de passe ne fonctionne plus
    const oldPasswordResponse = await request.post('/api/auth/login', {
      data: { username, password: oldPassword },
    });
    expect(oldPasswordResponse.ok()).toBeFalsy();
  });

  /**
   * Test 4: Un lien sans paramètres (user/alea) est refusé côté interface
   */
  test('Reset password page without parameters shows an invalid link error', async ({ page }) => {
    await resetPasswordPage.navigate();
    await expect(resetPasswordPage.invalidLinkMessage).toBeVisible();
  });

  /**
   * Test 5: Un token invalide est refusé par l'API
   */
  test('Reset password with an invalid token shows an error', async ({ page, request }) => {
    const suffix = Date.now();
    const username = `e2e_pr_inv_${suffix}`;
    const registerResponse = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password: 'Password123!',
        elapsedMs: 5000,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    const meResponse = await request.post('/api/auth/login', {
      data: { username, password: 'Password123!' },
    });
    const loginData = await meResponse.json();
    const userId = loginData.user.id;

    await resetPasswordPage.navigate(`/reset-password?user=${userId}&alea=invalidtoken`);
    await expect(resetPasswordPage.title).toBeVisible();

    await resetPasswordPage.setNewPassword('AnotherPassword789!');

    await expect(resetPasswordPage.errorMessage).toBeVisible({ timeout: 10000 });
    await expect(resetPasswordPage.errorMessage).toContainText(/invalide|expir/i);
    await expect(resetPasswordPage.successMessage).toHaveCount(0);
  });
});
