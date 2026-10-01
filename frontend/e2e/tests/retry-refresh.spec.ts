import { test, expect } from '@playwright/test';
import { RegisterPage } from '../page-objects/RegisterPage';
import { MyCampaignsPage } from '../page-objects/MyCampaignsPage';

/**
 * Tests du bouton "Réessayer" en cas d'erreur de chargement
 * Le retry force aussi le rafraîchissement du service worker
 * (recherche de mise à jour + purge des caches runtime) avant de relancer le chargement
 */
test.describe('Réessayer après erreur de chargement', () => {
  let registerPage: RegisterPage;
  let myCampaignsPage: MyCampaignsPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    myCampaignsPage = new MyCampaignsPage(page);

    // Créer un utilisateur unique et se connecter (l'inscription connecte automatiquement)
    const username = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');
  });

  test('le bouton Réessayer relance le chargement après une erreur réseau', async ({ page }) => {
    // Faire échouer le premier chargement des campagnes
    let shouldFail = true;
    await page.route('**/api/campaigns/mine*', async (route) => {
      if (shouldFail) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    // Act : ouvrir la page, le chargement échoue
    await myCampaignsPage.navigate();
    await expect(page.getByText('Une erreur est survenue')).toBeVisible({ timeout: 10000 });

    // Le bouton Réessayer est proposé
    const retryButton = page.getByRole('button', { name: 'Réessayer' });
    await expect(retryButton).toBeVisible();

    // Act : autoriser les appels puis cliquer sur Réessayer
    shouldFail = false;
    await retryButton.click();

    // Assert : l'erreur disparaît, la liste (vide pour un nouveau compte) s'affiche
    await expect(page.getByText('Une erreur est survenue')).toHaveCount(0);
    await expect(page.getByText("Vous n'avez aucune campagne active en cours")).toBeVisible({ timeout: 10000 });
  });
});
