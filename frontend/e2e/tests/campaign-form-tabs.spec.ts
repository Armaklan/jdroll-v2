import { test, expect, devices } from '@playwright/test';
import { CampaignFormPage } from '../page-objects/CampaignFormPage';
import { RegisterPage } from '../page-objects/RegisterPage';

/**
 * Tests E2E de la barre d'onglets du formulaire de campagne (création / configuration)
 * Sur mobile, la barre d'onglets déborde : des flèches gauche/droite doivent permettre
 * de naviguer dedans et signaler le contenu masqué.
 */

test.use(devices['iPhone 12']);

test.describe('Barre d\'onglets du formulaire de campagne (mobile)', () => {
  let campaignFormPage: CampaignFormPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    campaignFormPage = new CampaignFormPage(page);
    registerPage = new RegisterPage(page);

    // Créer un utilisateur unique et se connecter (l'inscription connecte automatiquement)
    const username = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');

    // Ouvrir le formulaire de création de campagne
    await campaignFormPage.navigate();
    await expect(campaignFormPage.tabsScrollContainer).toBeVisible({ timeout: 10000 });
  });

  test('La flèche droite est visible quand la barre déborde, la flèche gauche est masquée', async () => {
    // La barre déborde bien sur mobile (5 onglets)
    expect(await campaignFormPage.tabsOverflow()).toBe(true);

    // Au départ (scroll à 0) : flèche droite visible, flèche gauche masquée
    await expect(campaignFormPage.tabsScrollRightButton).toBeVisible();
    await expect(campaignFormPage.tabsScrollLeftButton).toBeHidden();
  });

  test('La flèche droite fait défiler la barre et révèle la flèche gauche', async () => {
    const scrollBefore = await campaignFormPage.getTabsScrollLeft();

    await campaignFormPage.tabsScrollRightButton.click();

    // Le scroll a avancé
    await expect
      .poll(async () => campaignFormPage.getTabsScrollLeft(), { timeout: 5000 })
      .toBeGreaterThan(scrollBefore);

    // Une fois scrollé, la flèche gauche devient visible
    await expect(campaignFormPage.tabsScrollLeftButton).toBeVisible();
  });

  test('La flèche gauche ramène la barre au début et disparaît', async () => {
    // Scroller d'abord vers la droite
    await campaignFormPage.tabsScrollRightButton.click();
    await expect
      .poll(async () => campaignFormPage.getTabsScrollLeft(), { timeout: 5000 })
      .toBeGreaterThan(0);

    // Puis revenir à gauche
    await campaignFormPage.tabsScrollLeftButton.click();

    await expect
      .poll(async () => campaignFormPage.getTabsScrollLeft(), { timeout: 5000 })
      .toBe(0);
    await expect(campaignFormPage.tabsScrollLeftButton).toBeHidden();
  });

  test('Mode édition : les flèches apparaissent après le chargement de la campagne', async ({ page }) => {
    // Créer une campagne pour obtenir une page d'édition accessible
    await page.getByPlaceholder(/La Malédiction de Strahd/).fill('Campagne e2e onglets');
    await page.getByRole('button', { name: /Créer la campagne/i }).first().click();
    await page.waitForURL(/\/forum\/\d+/, { timeout: 15000 });

    const campaignId = page.url().match(/\/forum\/(\d+)/)![1];

    // Ouvrir la page d'édition : la barre d'onglets n'est rendue qu'après chargement
    await campaignFormPage.navigateToEdit(campaignId);
    await expect(campaignFormPage.tabsScrollContainer).toBeVisible({ timeout: 10000 });

    // Les flèches doivent être calculées une fois la barre rendue
    expect(await campaignFormPage.tabsOverflow()).toBe(true);
    await expect(campaignFormPage.tabsScrollRightButton).toBeVisible();
    await expect(campaignFormPage.tabsScrollLeftButton).toBeHidden();
  });
});

test.describe('Barre d\'onglets du formulaire de campagne (desktop)', () => {
  let campaignFormPage: CampaignFormPage;
  let registerPage: RegisterPage;

  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    campaignFormPage = new CampaignFormPage(page);
    registerPage = new RegisterPage(page);

    const username = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');

    await campaignFormPage.navigate();
    await expect(campaignFormPage.tabsScrollContainer).toBeVisible({ timeout: 10000 });
  });

  test('En fin de barre, la flèche droite disparaît et la flèche gauche reste visible', async ({ page }) => {
    // Cliquer sur la flèche droite jusqu'à atteindre la fin de la barre
    for (let i = 0; i < 10; i++) {
      if (!(await campaignFormPage.tabsScrollRightButton.isVisible())) break;
      await campaignFormPage.tabsScrollRightButton.click();
      await page.waitForTimeout(400);
    }

    // En fin de scroll : plus de contenu à droite, du contenu à gauche
    await expect(campaignFormPage.tabsScrollRightButton).toBeHidden();
    await expect(campaignFormPage.tabsScrollLeftButton).toBeVisible();
  });
});
