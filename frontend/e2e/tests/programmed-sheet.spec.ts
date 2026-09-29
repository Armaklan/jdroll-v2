import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { CampaignFormPage } from '../page-objects/CampaignFormPage';

/**
 * Tests E2E du module de fiche de personnage programmée (feature flag "programmed-sheet")
 * - Le sélecteur de mode de feuille n'offre le mode "Fiche programmée" que si la feature est active
 * - La configuration de campagne permet de construire une fiche (pages / sections / composants)
 * - Le mode et la définition sont persistés et retrouvés à l'édition
 *
 * Le flag est piloté via l'API admin avant le chargement de la page (pas de bascule
 * en cours de session : le front ne recharge les features qu'au montage).
 *
 * Mode sérial : les tests partagent l'état global du feature flip (base de données).
 */

test.describe.configure({ mode: 'serial' });

test.describe('Mode de feuille de personnage (fiche programmée)', () => {
  let loginPage: LoginPage;
  let campaignFormPage: CampaignFormPage;
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'password' },
    });
    expect(loginResponse.ok()).toBeTruthy();
    adminToken = (await loginResponse.json()).token;
  });

  /**
   * Active ou désactive le feature flip "programmed-sheet" côté serveur.
   */
  const setProgrammedSheetFeature = async (
    request: import('@playwright/test').APIRequestContext,
    enabled: boolean
  ) => {
    const response = await request.put('/api/features/programmed-sheet', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { enabled },
    });
    expect(response.ok()).toBeTruthy();
  };

  test.afterAll(async ({ request }) => {
    // Nettoyage : désactiver la feature pour ne pas impacter les autres suites
    if (adminToken) {
      await setProgrammedSheetFeature(request, false);
    }
  });

  test('Le mode fiche programmée est verrouillé quand la feature est inactive', async ({ page, request }) => {
    await setProgrammedSheetFeature(request, false);
    loginPage = new LoginPage(page);
    campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();

    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    const selector = page.getByTestId('sheet-mode-selector');
    await expect(selector).toBeVisible({ timeout: 10000 });

    // Les 3 modes sont proposés, mais "Fiche programmée" est désactivée
    await expect(page.getByTestId('sheet-mode-technical')).toBeVisible();
    await expect(page.getByTestId('sheet-mode-graphic')).toBeVisible();
    const programmedRadio = page.getByTestId('sheet-mode-programmed').locator('input[type="radio"]');
    await expect(programmedRadio).toBeVisible();
    await expect(programmedRadio).toBeDisabled();
  });

  test('Permet de construire une fiche programmée et persiste le mode', async ({ page, request }) => {
    const campaignName = `E2E Fiche Programmée ${Date.now()}`;
    await setProgrammedSheetFeature(request, true);
    loginPage = new LoginPage(page);
    campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByPlaceholder(/La Malédiction de Strahd/).fill(campaignName);

    // Onglet feuille de personnage
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });

    // Sans template configuré, le mode par défaut dérivé est "Description technique"
    await expect(
      page.getByTestId('sheet-mode-technical').locator('input[type="radio"]')
    ).toBeChecked();

    // Mode "Description technique" : seule la config de description technique est visible
    await expect(
      page.getByRole('heading', { name: /Template de Personnage/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Feuille de Personnage Graphique/i })
    ).toHaveCount(0);
    await expect(page.getByTestId('programmed-sheet-builder')).toHaveCount(0);

    // Mode "Fiche graphique" : description technique + fiche graphique
    await page.getByTestId('sheet-mode-graphic').click();
    await expect(
      page.getByRole('heading', { name: /Template de Personnage/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Feuille de Personnage Graphique/i })
    ).toBeVisible();
    await expect(page.getByTestId('programmed-sheet-builder')).toHaveCount(0);

    // L'option fiche programmée est active
    await expect(
      page.getByTestId('sheet-mode-programmed').locator('input[type="radio"]')
    ).toBeEnabled({ timeout: 10000 });

    // Mode "Fiche programmée" : seul le constructeur est visible
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Template de Personnage/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /Feuille de Personnage Graphique/i })
    ).toHaveCount(0);

    // Ajouter une section à la page
    await page.getByTestId('add-sheet-section').click();
    const section = builder.locator('[data-testid^="sheet-section-"]').first();
    await expect(section).toBeVisible();

    // Configurer la section via la modale flottante.
    // La touche Entrée valide la modale sans soumettre le formulaire de campagne
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    const modal = page.getByTestId('sheet-config-modal');
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-title').fill('Identité');
    await modal.getByTestId('sheet-config-title').press('Enter');
    await expect(modal).toBeHidden();
    // Aucune soumission du formulaire : on est toujours sur la page de configuration
    await expect(page).toHaveURL(/\/campaigns\/new/);
    await expect(builder.getByText('Identité')).toBeVisible();

    // Ajouter un composant texte via le "+" de la section (la section est un composant du palette)
    await section.locator('[data-testid^="add-in-section-"]').first().selectOption('text');
    const component = section.locator('[data-testid^="sheet-component-"]').first();
    await expect(component).toBeVisible();

    // Configurer le composant via la modale flottante
    await component.locator('[data-testid^="sheet-component-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-label').fill('Nom du personnage');

    // Libellé à gauche du champ de saisie
    await modal.getByTestId('sheet-config-label-left').click();
    await modal.getByTestId('sheet-config-close').click();

    // Le rendu WYSIWYG affiche le libellé tel qu'il sera sur la feuille finale,
    // positionné à gauche du champ
    await expect(section.getByText('Nom du personnage')).toBeVisible();
    await expect(
      builder.locator('[data-testid^="sheet-field-"]').first()
    ).toHaveClass(/flex/);
    // Le libellé à gauche est centré verticalement avec son champ
    await expect(
      builder.locator('[data-testid^="sheet-field-"]').first()
    ).toHaveClass(/items-center/);

    // Ajouter un scoring (5 points par défaut)
    await section.locator('[data-testid^="add-in-section-"]').first().selectOption('scoring');
    const scoringBox = builder.locator('div[data-testid^="sheet-component-"]').nth(1);
    await expect(scoringBox).toBeVisible();
    // L'aperçu du scoring montre exactement 5 pastilles, sans compteur "x / y"
    await expect(scoringBox.locator('[data-testid^="scoring-dot-"]')).toHaveCount(5);
    await expect(scoringBox.getByText(/^\s*0\s*\/\s*5\s*$/)).toHaveCount(0);

    // Passer la section en horizontal : l'agencement des composants change à l'écran
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-horizontal').click();

    // Bordure personnalisée de la section (épaisseur + couleur), visible à l'écran
    await modal.getByTestId('sheet-config-border-width').fill('3');
    await modal.locator('input[type="color"]').fill('#dc2626');
    await modal.getByTestId('sheet-config-close').click();
    await expect(
      builder.locator('[data-testid^="sheet-section-"]').first()
    ).toHaveCSS('border-width', '3px');
    await expect(
      builder.locator('[data-testid^="sheet-section-"]').first()
    ).toHaveCSS('border-color', 'rgb(220, 38, 38)');
    await expect(
      builder.locator('[data-testid^="section-children-"]').first()
    ).toHaveClass(/flex-wrap/);

    // Enregistrer la campagne
    await page.getByRole('button', { name: /Créer la campagne/i }).first().click();
    await page.waitForURL(/\/forum\/\d+/, { timeout: 15000 });

    // Vérifier la persistance : rouvrir la configuration
    const campaignId = page.url().match(/\/forum\/(\d+)/)![1];
    await campaignFormPage.navigateToEdit(campaignId);
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();

    // Le mode programmé est conservé et la définition est rechargée
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId('sheet-mode-programmed').locator('input[type="radio"]')
    ).toBeEnabled({ timeout: 10000 });
    await expect(
      page.getByTestId('sheet-mode-programmed').locator('input[type="radio"]')
    ).toBeChecked();

    const persistedBuilder = page.getByTestId('programmed-sheet-builder');
    await expect(persistedBuilder).toBeVisible();
    await expect(persistedBuilder.getByText('Identité')).toBeVisible();
    await expect(persistedBuilder.getByText('Nom du personnage')).toBeVisible();
    // La bordure et la position du libellé sont persistées
    await expect(
      persistedBuilder.locator('[data-testid^="sheet-section-"]').first()
    ).toHaveCSS('border-width', '3px');
    await expect(
      persistedBuilder.locator('[data-testid^="sheet-field-"]').first()
    ).toHaveClass(/flex/);

    // Saisie de personnage : le scoring affiche exactement 5 pastilles, sans compteur
    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.getByRole('button', { name: /Nouveau personnage/i }).first().click();
    const fillArea = page.getByTestId('programmed-sheet-fill');
    await expect(fillArea).toBeVisible({ timeout: 10000 });
    await expect(fillArea.locator('[data-testid^="scoring-dot-"]')).toHaveCount(5);
    await expect(fillArea.getByText(/^\s*\d+\s*\/\s*\d+\s*$/)).toHaveCount(0);
  });

  test('Réordonne composants et sections par glisser-déposer', async ({ page, request }) => {
    await setProgrammedSheetFeature(request, true);
    loginPage = new LoginPage(page);
    campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();

    const sectionBoxes = builder.locator('div[data-testid^="sheet-section-"]');
    const sectionHeaders = builder.locator('div[data-testid^="section-header-"]');
    const componentBoxes = builder.locator('div[data-testid^="sheet-component-"]');
    const modal = page.getByTestId('sheet-config-modal');

    // Deux sections nommées
    for (const title of ['Section A', 'Section B']) {
      await page.getByTestId('add-sheet-section').click();
      const box = sectionBoxes.last();
      await box.locator('[data-testid^="sheet-section-edit-"]').first().click();
      await expect(modal).toBeVisible();
      await modal.getByTestId('sheet-config-title').fill(title);
      await modal.getByTestId('sheet-config-close').click();
    }
    await expect(sectionBoxes.first()).toContainText('Section A');
    await expect(sectionBoxes.nth(1)).toContainText('Section B');

    // Deux composants texte dans la section A
    const addInSectionA = sectionBoxes.first().locator('[data-testid^="add-in-section-"]').first();
    await addInSectionA.selectOption('text');
    await addInSectionA.selectOption('text');

    const labelComponent = async (index: number, label: string) => {
      await componentBoxes.nth(index).locator('[data-testid^="sheet-component-edit-"]').first().click();
      await expect(modal).toBeVisible();
      await modal.getByTestId('sheet-config-label').fill(label);
      await modal.getByTestId('sheet-config-close').click();
    };
    await labelComponent(0, 'Premier');
    await labelComponent(1, 'Deuxième');
    await expect(componentBoxes.first()).toContainText('Premier');

    // Glisser "Deuxième" avant "Premier" (moitié haute de la cible)
    await componentBoxes.filter({ hasText: 'Deuxième' }).dragTo(
      componentBoxes.filter({ hasText: 'Premier' }),
      { targetPosition: { x: 10, y: 5 } }
    );
    await expect(componentBoxes.first()).toContainText('Deuxième');
    await expect(componentBoxes.nth(1)).toContainText('Premier');

    // Glisser la section B avant la section A (moitié haute de l'en-tête cible)
    await sectionHeaders.filter({ hasText: 'Section B' }).dragTo(
      sectionHeaders.filter({ hasText: 'Section A' }),
      { targetPosition: { x: 10, y: 5 } }
    );
    await expect(sectionBoxes.first()).toContainText('Section B');
    await expect(sectionBoxes.nth(1)).toContainText('Section A');

    // Déplacer le composant "Deuxième" de la section A vers la section B
    // (dépôt sur le corps de la section B : ajout en fin de ses enfants)
    await componentBoxes.filter({ hasText: 'Deuxième' }).dragTo(
      sectionBoxes.first(),
      { targetPosition: { x: 30, y: 60 } }
    );
    await expect(sectionBoxes.first()).toContainText('Deuxième');
    await expect(sectionBoxes.nth(1)).not.toContainText('Deuxième');

    // Imbriquer la section A dans la section B (dépôt sur le corps de B)
    await sectionHeaders.filter({ hasText: 'Section A' }).dragTo(
      sectionBoxes.first(),
      { targetPosition: { x: 30, y: 70 } }
    );
    // La section B (première) contient désormais la section A
    await expect(sectionBoxes.first()).toContainText('Section A');
  });

  test('composants et sous-sections partagent le même flux ordonné', async ({ page, request }) => {
    await setProgrammedSheetFeature(request, true);
    const loginPage = new LoginPage(page);
    const campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();

    const modal = page.getByTestId('sheet-config-modal');
    const sectionBoxes = builder.locator('div[data-testid^="sheet-section-"]');

    // Une section principale en horizontal
    await page.getByTestId('add-sheet-section').click();
    const main = sectionBoxes.first();
    await main.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-horizontal').click();
    await modal.getByTestId('sheet-config-title').fill('Principale');
    await modal.getByTestId('sheet-config-close').click();

    // Le "+" propre à la section principale est le dernier dans le DOM
    // (les sous-sections rendent leur propre contrôle "+" avant lui)
    const addInMain = main.locator('[data-testid^="add-in-section-"]').last();
    const labelComponent = async (index: number, label: string) => {
      await builder.locator('div[data-testid^="sheet-component-"]').nth(index)
        .locator('[data-testid^="sheet-component-edit-"]').first().click();
      await expect(modal).toBeVisible();
      await modal.getByTestId('sheet-config-label').fill(label);
      await modal.getByTestId('sheet-config-close').click();
    };

    // Composant, puis sous-section, puis composant : ordre libre dans le flux
    await addInMain.selectOption('text');
    await labelComponent(0, 'Premier');

    // Par défaut, un composant unique dans une section horizontale remplit l'espace
    const earlyChildren = builder.locator('[data-testid^="section-children-"]').first();
    const earlyChild = earlyChildren.locator(':scope > div');
    await expect(earlyChild).toHaveCount(1);
    const containerBox = await earlyChildren.boundingBox();
    const onlyChildBox = await earlyChild.first().boundingBox();
    expect(containerBox).not.toBeNull();
    expect(onlyChildBox).not.toBeNull();
    expect(onlyChildBox!.width).toBeGreaterThan(containerBox!.width - 20);

    await addInMain.selectOption('section');
    const sub = main.locator('div[data-testid^="sheet-section-"]').last();
    await sub.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-title').fill('Milieu');
    await modal.getByTestId('sheet-config-close').click();

    await addInMain.selectOption('text');
    await labelComponent(1, 'Deuxième');

    // Le conteneur d'enfants de la section principale contient les 3 éléments dans l'ordre
    const childrenContainer = builder.locator('[data-testid^="section-children-"]').first();
    const directChildren = childrenContainer.locator(':scope > div');
    await expect(directChildren).toHaveCount(3);
    await expect(directChildren.nth(0)).toContainText('Premier');
    await expect(directChildren.nth(1)).toContainText('Milieu');
    await expect(directChildren.nth(2)).toContainText('Deuxième');

    // En horizontal, les 3 éléments sont disposés côte à côte à l'écran
    const boxPremier = await directChildren.nth(0).boundingBox();
    const boxMilieu = await directChildren.nth(1).boundingBox();
    const boxDeuxieme = await directChildren.nth(2).boundingBox();
    expect(boxPremier).not.toBeNull();
    expect(boxMilieu).not.toBeNull();
    expect(boxDeuxieme).not.toBeNull();
    expect(boxMilieu!.x).toBeGreaterThan(boxPremier!.x);
    expect(boxDeuxieme!.x).toBeGreaterThan(boxMilieu!.x);
  });

  test('un champ ajouté dans une section horizontale se place à droite des sous-sections', async ({ page, request }) => {
    await setProgrammedSheetFeature(request, true);
    const loginPage = new LoginPage(page);
    const campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();

    const modal = page.getByTestId('sheet-config-modal');
    const sectionBoxes = builder.locator('div[data-testid^="sheet-section-"]');

    // Une section conteneur en horizontal
    await page.getByTestId('add-sheet-section').click();
    const container = sectionBoxes.first();
    await container.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-horizontal').click();
    await modal.getByTestId('sheet-config-title').fill('Conteneur');
    await modal.getByTestId('sheet-config-close').click();

    // Deux sous-sections (Attributs, Compétences) dans le conteneur
    const addInContainer = container.locator('[data-testid^="add-in-section-"]').last();
    for (const title of ['Attributs', 'Compétences']) {
      await addInContainer.selectOption('section');
      const sub = container.locator('div[data-testid^="sheet-section-"]').last();
      await sub.locator('[data-testid^="sheet-section-edit-"]').first().click();
      await expect(modal).toBeVisible();
      await modal.getByTestId('sheet-config-title').fill(title);
      await modal.getByTestId('sheet-config-close').click();
    }

    // Ajout d'un champ textarea : il doit se placer à droite, sur la même ligne
    await addInContainer.selectOption('textarea');

    const containerChildren = builder.locator('[data-testid^="section-children-"]').first().locator(':scope > div');
    await expect(containerChildren).toHaveCount(3);
    const boxAttributs = await containerChildren.nth(0).boundingBox();
    const boxCompetences = await containerChildren.nth(1).boundingBox();
    const boxTextarea = await containerChildren.nth(2).boundingBox();
    expect(boxAttributs).not.toBeNull();
    expect(boxCompetences).not.toBeNull();
    expect(boxTextarea).not.toBeNull();
    // Le textarea est plus à droite que les deux sous-sections
    expect(boxCompetences!.x).toBeGreaterThan(boxAttributs!.x);
    expect(boxTextarea!.x).toBeGreaterThan(boxCompetences!.x);
    // Et il reste sur la même ligne (haut aligné avec les sous-sections)
    expect(Math.abs(boxTextarea!.y - boxAttributs!.y)).toBeLessThan(10);
  });
});
