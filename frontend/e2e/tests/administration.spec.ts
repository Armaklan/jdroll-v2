import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { HomePage } from '../page-objects/HomePage';

/**
 * Tests E2E de l'écran d'administration (feature flipping)
 * - Le menu "Administration" n'est visible que pour les admins (profil 2)
 * - L'écran permet d'activer / désactiver une feature
 * Comptes de seed : admin/password (profil 2), testuser/password (profil 0)
 */
test.describe('Administration (feature flipping)', () => {
  let loginPage: LoginPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    homePage = new HomePage(page);
  });

  test('Un utilisateur non admin ne voit pas le menu Administration et est redirigé', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('testuser', 'password');

    // Le menu Administration n'est pas visible pour un joueur standard
    await expect(page.getByRole('link', { name: 'Administration' })).toHaveCount(0);

    // Accès direct à l'écran d'administration : redirection vers l'accueil
    await page.goto('/administration');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Administration' })).toHaveCount(0);
  });

  test('Un admin accède à l\'écran de feature flipping depuis le menu', async ({ page }) => {
    await loginPage.navigate();
    await loginPage.login('admin', 'password');

    // Le menu Administration est visible pour un admin
    const adminLink = page.getByRole('link', { name: 'Administration' }).first();
    await expect(adminLink).toBeVisible();

    // Navigation depuis le menu haut
    await adminLink.click();
    await expect(page).toHaveURL(/\/administration/);

    // L'écran de feature flipping est affiché avec la feature de seed
    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
    const featureRow = page.getByTestId('feature-sample-feature');
    await expect(featureRow).toBeVisible();

    // Activation de la feature
    await featureRow.getByRole('button', { name: /Activer sample-feature/i }).click();
    await expect(featureRow.getByText('Active')).toBeVisible();

    // Désactivation de la feature
    await featureRow.getByRole('button', { name: /Désactiver sample-feature/i }).click();
    await expect(featureRow.getByText('Inactive')).toBeVisible();
  });
});
