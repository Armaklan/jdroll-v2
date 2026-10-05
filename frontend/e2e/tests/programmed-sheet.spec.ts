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
    await modal.getByTestId('sheet-config-border-color').fill('#dc2626');
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

  test('couleur de fond de section et duplication d’éléments', async ({ page, request }) => {
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
    const componentBoxes = builder.locator('div[data-testid^="sheet-component-"]');

    // Une section titrée avec un composant texte
    await page.getByTestId('add-sheet-section').click();
    const section = sectionBoxes.first();
    await expect(section).toBeVisible();
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-title').fill('Identité');
    await modal.getByTestId('sheet-config-close').click();

    await section.locator('[data-testid^="add-in-section-"]').first().selectOption('text');
    await componentBoxes.first().locator('[data-testid^="sheet-component-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-label').fill('Nom');
    await modal.getByTestId('sheet-config-close').click();

    // Couleur de fond de la section via la modale, visible à l'écran
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-background-color').fill('#fef3c7');
    await modal.getByTestId('sheet-config-close').click();
    await expect(section).toHaveCSS('background-color', 'rgb(254, 243, 199)');

    // L'option "Transparent" retire le fond personnalisé
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-background-transparent').click();
    await modal.getByTestId('sheet-config-close').click();
    await expect(section).not.toHaveCSS('background-color', 'rgb(254, 243, 199)');

    // Ressaisie d'une couleur de fond : elle sera propagée à la copie
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-background-color').fill('#dcfce7');
    await modal.getByTestId('sheet-config-close').click();
    await expect(section).toHaveCSS('background-color', 'rgb(220, 252, 231)');

    // Duplication d'un composant : la copie suit immédiatement l'original
    await componentBoxes.first().locator('[data-testid^="sheet-component-duplicate-"]').first().click();
    await expect(componentBoxes).toHaveCount(2);
    await expect(componentBoxes.nth(0)).toContainText('Nom');
    await expect(componentBoxes.nth(1)).toContainText('Nom');

    // Duplication d'une section : titre, contenu et fond sont conservés
    await sectionBoxes.first().locator('[data-testid^="sheet-section-duplicate-"]').first().click();
    await expect(sectionBoxes).toHaveCount(2);
    await expect(sectionBoxes.nth(1)).toContainText('Identité');
    await expect(sectionBoxes.nth(1)).toContainText('Nom');
    await expect(sectionBoxes.nth(1)).toHaveCSS('background-color', 'rgb(220, 252, 231)');
    // La copie de section contient ses propres composants dupliqués
    await expect(
      sectionBoxes.nth(1).locator('div[data-testid^="sheet-component-"]')
    ).toHaveCount(2);
  });

  test('associe une image de fond à une page (téléversement, URL, retrait)', async ({ page, request }) => {
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

    // Une section pour matérialiser le contenu de la page
    await page.getByTestId('add-sheet-section').click();
    const canvas = builder.locator('[data-testid^="sheet-page-canvas-"]');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCSS('background-image', 'none');

    // Téléversement d'une image de fond : l'URL retournée par l'API est appliquée
    await builder.locator('[data-testid^="sheet-page-background-file-"]').setInputFiles({
      name: 'fond.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      ),
    });
    await expect(canvas).toHaveCSS(
      'background-image',
      /url\("http:\/\/localhost:\d+\/files\/editor\/\d+\/[a-f0-9]+\.png"\)/
    );
    await expect(canvas).toHaveCSS('background-size', 'cover');

    // La page prend une taille fixe définie par l'image : 800px de large,
    // hauteur au ratio de l'image (PNG 1x1 -> 800x800)
    const pageCanvas = builder.locator('[data-testid^="sheet-page-canvas-"]');
    await expect(pageCanvas).toHaveCSS('width', '800px');
    await expect(pageCanvas).toHaveCSS('height', '800px');

    // L'URL est reportée dans le champ de saisie
    await expect(
      builder.locator('[data-testid^="sheet-page-background-url-"]')
    ).toHaveValue(/\/files\/editor\/\d+\/[a-f0-9]+\.png$/);

    // Retrait de l'image de fond : la page redevient flexible
    await builder.locator('[data-testid^="sheet-page-background-remove-"]').click();
    await expect(canvas).toHaveCSS('background-image', 'none');
    await expect(pageCanvas).not.toHaveCSS('width', '800px');

    // Saisie directe d'une URL externe
    await builder.locator('[data-testid^="sheet-page-background-url-"]').fill('https://example.com/fond.jpg');
    await expect(canvas).toHaveCSS('background-image', 'url("https://example.com/fond.jpg")');

    // Le champ vidé retire l'image de fond
    await builder.locator('[data-testid^="sheet-page-background-url-"]').fill('');
    await expect(canvas).toHaveCSS('background-image', 'none');
  });

  test('positionnement libre : placement au drag\'n\'drop, agrandissement du canevas, persistance', async ({ page, request }) => {
    const campaignName = `E2E Section Libre ${Date.now()}`;
    await setProgrammedSheetFeature(request, true);
    loginPage = new LoginPage(page);
    campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByPlaceholder(/La Malédiction de Strahd/).fill(campaignName);
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();

    const modal = page.getByTestId('sheet-config-modal');

    // Section passée en disposition "Libre"
    await page.getByTestId('add-sheet-section').click();
    const section = builder.locator('div[data-testid^="sheet-section-"]').first();
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-title').fill('Zone libre');
    await modal.getByTestId('sheet-config-layout-free').click();
    await modal.getByTestId('sheet-config-close').click();

    const canvas = builder.locator('[data-testid^="section-canvas-"]').first();
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCSS('height', '240px');

    // Deux composants ajoutés au canevas : empilés par défaut
    const addInSection = section.locator('[data-testid^="add-in-section-"]').last();
    await addInSection.selectOption('text');
    await addInSection.selectOption('text');
    const componentBoxes = builder.locator('div[data-testid^="sheet-component-"]');
    await expect(componentBoxes).toHaveCount(2);
    await expect(componentBoxes.first()).toHaveCSS('position', 'absolute');
    await expect(componentBoxes.first()).toHaveCSS('top', '16px');
    await expect(componentBoxes.nth(1)).toHaveCSS('top', `${16 + 64}px`);

    // Placement libre du premier composant à (200, 150) dans le canevas :
    // le dépôt s'ancre sur le composant tenu (dragTo le préhend en son
    // centre), le coin haut-gauche atterrit donc à (200, 150) moins ce
    // décalage de préhension
    const boxA = await componentBoxes.first().boundingBox();
    expect(boxA).not.toBeNull();
    await componentBoxes.first().dragTo(canvas, { targetPosition: { x: 200, y: 150 } });
    const topA = await componentBoxes.first().evaluate((el) => parseFloat(getComputedStyle(el).top));
    const leftA = await componentBoxes.first().evaluate((el) => parseFloat(getComputedStyle(el).left));
    expect(Math.abs(topA - (150 - boxA!.height / 2))).toBeLessThan(4);
    expect(Math.abs(leftA - (200 - boxA!.width / 2))).toBeLessThan(4);

    // Dépôt sous le canevas : la section s'agrandit pour contenir l'élément.
    // Le drag natif de l'environnement de test ne rediffuse le dragover qu'au
    // premier changement de cible : on pilote ici le cycle complet
    // (dragstart -> dragover -> drop) par des DragEvent synthétiques, un
    // evaluate par événement pour laisser React appliquer son état entre
    // chacun. Les coordonnées sont celles d'un dépôt sous le canevas.
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const boxB = await componentBoxes.nth(1).boundingBox();
    expect(boxB).not.toBeNull();
    const dropX = canvasBox!.x + 30;
    const dropY = canvasBox!.y + 400;
    const draggedId = await componentBoxes.nth(1).evaluate((el) =>
      el.getAttribute('data-testid')
    );
    await page.evaluate(
      ({ id, x, y }) => {
        document
          .querySelector(`[data-testid="${id}"]`)
          ?.dispatchEvent(
            new DragEvent('dragstart', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { id: draggedId, x: boxB!.x + 20, y: boxB!.y + 20 }
    );
    await page.evaluate(
      ({ x, y }) => {
        document
          .querySelector('[data-testid^="sheet-page-canvas-"]')
          ?.dispatchEvent(
            new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { x: dropX, y: dropY }
    );
    await page.evaluate(
      ({ x, y }) => {
        document
          .querySelector('[data-testid^="sheet-page-canvas-"]')
          ?.dispatchEvent(
            new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { x: dropX, y: dropY }
    );
    // Le placement est ancré sur le composant tenu : préhension à 20px
    // du coin haut-gauche, donc dépôt du coin à (400 - 20) du canevas
    const expectedTopB = 400 - 20;
    const canvasHeight = await canvas.evaluate((el) => parseFloat(getComputedStyle(el).height));
    expect(canvasHeight).toBeGreaterThanOrEqual(expectedTopB + boxB!.height + 16 - 4);
    const topB = await componentBoxes.nth(1).evaluate((el) => parseFloat(getComputedStyle(el).top));
    expect(Math.abs(topB - expectedTopB)).toBeLessThan(4);

    // Une sous-section ajoutée au canevas libre est elle aussi positionnée
    await addInSection.selectOption('section');
    const subSection = section.locator('div[data-testid^="sheet-section-"]').last();
    await expect(subSection).toHaveCSS('position', 'absolute');
    // La sous-section passe elle-même en libre : son canevas est redimensionnable
    await subSection.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-free').click();
    await modal.getByTestId('sheet-config-close').click();
    const subCanvas = subSection.locator('[data-testid^="section-canvas-"]');
    await expect(subCanvas).toBeVisible();

    // Redimensionnement du premier composant (poignée coin bas-droit) :
    // la largeur suit le pointeur (+100px), la hauteur est sans effet.
    // On centre d'abord l'élément dans le viewport pour l'écarter de la
    // barre sticky d'enregistrement du formulaire.
    const compBox = componentBoxes.first();
    await compBox.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const compWidthBefore = await compBox.evaluate((el) => el.getBoundingClientRect().width);
    const compHandle = await compBox
      .locator('[data-testid^="resize-component-"]')
      .boundingBox();
    expect(compHandle).not.toBeNull();
    await page.mouse.move(compHandle!.x + 2, compHandle!.y + 2);
    await page.mouse.down();
    await page.mouse.move(compHandle!.x + 102, compHandle!.y + 42, { steps: 5 });
    await page.mouse.up();
    const compWidthAfter = await compBox.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(compWidthAfter - (compWidthBefore + 100))).toBeLessThan(4);

    // Redimensionnement de la sous-section : largeur (+60) et hauteur du
    // canevas (240 -> 360)
    await subSection.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const subWidthBefore = await subSection.evaluate((el) => el.getBoundingClientRect().width);
    const subHandle = await subSection
      .locator('[data-testid^="resize-section-"]')
      .boundingBox();
    expect(subHandle).not.toBeNull();
    await page.mouse.move(subHandle!.x + 2, subHandle!.y + 2);
    await page.mouse.down();
    await page.mouse.move(subHandle!.x + 62, subHandle!.y + 122, { steps: 5 });
    await page.mouse.up();
    const subWidthAfter = await subSection.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(subWidthAfter - (subWidthBefore + 60))).toBeLessThan(4);
    await expect(subCanvas).toHaveCSS('height', '360px');

    // Enregistrement puis vérification sur la feuille de saisie de personnage
    await page.getByRole('button', { name: /Créer la campagne/i }).first().click();
    await page.waitForURL(/\/forum\/\d+/, { timeout: 15000 });
    const campaignId = page.url().match(/\/forum\/(\d+)/)![1];

    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.getByRole('button', { name: /Nouveau personnage/i }).first().click();
    const fillArea = page.getByTestId('programmed-sheet-fill');
    await expect(fillArea).toBeVisible({ timeout: 10000 });

    const viewCanvas = fillArea.locator('[data-testid^="sheet-view-canvas-"]').first();
    await expect(viewCanvas).toBeVisible();
    const viewHeight = await viewCanvas.evaluate((el) => parseFloat(getComputedStyle(el).height));
    expect(viewHeight).toBeGreaterThanOrEqual(expectedTopB + boxB!.height + 16 - 4);

    // Les positions et tailles libres sont conservées : le premier champ
    // garde la position déposée dans le constructeur (ancrage composant),
    // redimensionné à la largeur choisie
    const firstField = fillArea.locator('[data-testid^="sheet-field-"]').first();
    await expect(firstField).toHaveCSS('position', 'absolute');
    const viewTop = await firstField.evaluate((el) => parseFloat(getComputedStyle(el).top));
    expect(Math.abs(viewTop - topA)).toBeLessThan(4);
    const viewWidth = await firstField.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(viewWidth - compWidthAfter)).toBeLessThan(4);

    // L'enregistrement d'une campagne existante (update) avec une fiche
    // en layout libre doit passer la validation serveur sans erreur
    // (régression : "Invalid enum value ... received 'free'").
    await campaignFormPage.navigateToEdit(campaignId);
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('programmed-sheet-builder')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Enregistrer les modifications/i }).first().click();
    await page.waitForURL(/\/forum\/\d+/, { timeout: 15000 });
  });

  test('page à taille fixe : le positionnement libre ne dépasse pas l’image de fond', async ({ page, request }) => {
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

    // Image de fond 1x1 : la page est fixée à 800x800
    await builder.locator('[data-testid^="sheet-page-background-file-"]').setInputFiles({
      name: 'fond.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      ),
    });
    const pageCanvas = builder.locator('[data-testid^="sheet-page-canvas-"]');
    await expect(pageCanvas).toHaveCSS('width', '800px');
    await expect(pageCanvas).toHaveCSS('height', '800px');

    // Une section libre avec un composant
    const modal = page.getByTestId('sheet-config-modal');
    await page.getByTestId('add-sheet-section').click();
    const section = builder.locator('div[data-testid^="sheet-section-"]').first();
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-free').click();
    await modal.getByTestId('sheet-config-close').click();

    const sectionCanvas = builder.locator('[data-testid^="section-canvas-"]').first();
    await expect(sectionCanvas).toBeVisible();
    await section
      .locator('[data-testid^="add-in-section-"]').last()
      .selectOption('text');
    const componentBoxes = builder.locator('div[data-testid^="sheet-component-"]');
    await expect(componentBoxes).toHaveCount(1);

    // Dépôt très bas (au-delà de la page) : le cycle dragstart ->
    // dragover -> drop est piloté par des DragEvent synthétiques sur le
    // canevas de section, avec des coordonnées sous le bas de la page.
    const pageCanvasBox = await pageCanvas.boundingBox();
    const canvasBox = await sectionCanvas.boundingBox();
    expect(pageCanvasBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    const maxCanvasHeight = 800 - (canvasBox!.y - pageCanvasBox!.y);
    const dropX = canvasBox!.x + 30;
    const dropY = pageCanvasBox!.y + 900;
    // Point de préhension réel dans le composant tenu : le placement
    // s'ancre sur le composant, pas sur le pointeur
    const boxComp = await componentBoxes.first().boundingBox();
    expect(boxComp).not.toBeNull();
    const draggedId = await componentBoxes.first().evaluate((el) =>
      el.getAttribute('data-testid')
    );
    await page.evaluate(
      ({ id, x, y }) => {
        document
          .querySelector(`[data-testid="${id}"]`)
          ?.dispatchEvent(
            new DragEvent('dragstart', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { id: draggedId, x: boxComp!.x + 10, y: boxComp!.y + 10 }
    );
    await page.evaluate(
      ({ x, y }) => {
        document
          .querySelector('[data-testid^="section-canvas-"]')
          ?.dispatchEvent(
            new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { x: dropX, y: dropY }
    );
    await page.evaluate(
      ({ x, y }) => {
        document
          .querySelector('[data-testid^="section-canvas-"]')
          ?.dispatchEvent(
            new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              dataTransfer: new DataTransfer(),
            })
          );
      },
      { x: dropX, y: dropY }
    );

    // Le canevas est plafonné : impossible d'étendre au-delà de la page
    const canvasHeight = await sectionCanvas.evaluate((el) =>
      parseFloat(getComputedStyle(el).height)
    );
    expect(Math.abs(canvasHeight - maxCanvasHeight)).toBeLessThan(4);
    expect(canvasHeight).toBeLessThan(800);

    // Le composant est calé à l'intérieur du canevas plafonné
    const top = await componentBoxes.first().evaluate((el) =>
      parseFloat(getComputedStyle(el).top)
    );
    const itemHeight = await componentBoxes.first().evaluate((el) =>
      el.getBoundingClientRect().height
    );
    expect(top).toBeLessThanOrEqual(maxCanvasHeight - itemHeight - 16);
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

  test('étire un enfant et redistribue la taille des frères (horizontal et vertical)', async ({ page, request }) => {
    await setProgrammedSheetFeature(request, true);
    const loginPage = new LoginPage(page);
    const campaignFormPage = new CampaignFormPage(page);

    await loginPage.navigate();
    await loginPage.login('admin', 'password');
    await campaignFormPage.navigate();
    await page.getByPlaceholder(/La Malédiction de Strahd/).fill(`E2E Répartition ${Date.now()}`);
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(page.getByTestId('sheet-mode-selector')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sheet-mode-programmed').click();
    const builder = page.getByTestId('programmed-sheet-builder');
    await expect(builder).toBeVisible();

    const modal = page.getByTestId('sheet-config-modal');

    // Section horizontale avec trois composants texte
    await page.getByTestId('add-sheet-section').click();
    const section = builder.locator('div[data-testid^="sheet-section-"]').first();
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-title').fill('Répartition');
    await modal.getByTestId('sheet-config-layout-horizontal').click();
    await modal.getByTestId('sheet-config-close').click();

    const addInSection = section.locator('[data-testid^="add-in-section-"]').last();
    // Des zones de texte (hautes) pour que la redistribution verticale
    // soit significative malgré la taille minimale des frères
    await addInSection.selectOption('textarea');
    await addInSection.selectOption('textarea');
    await addInSection.selectOption('textarea');
    const childrenContainer = builder.locator('[data-testid^="section-children-"]').first();
    const children = childrenContainer.locator(':scope > div');
    await expect(children).toHaveCount(3);

    const widthsBefore: number[] = [];
    for (let i = 0; i < 3; i++) {
      widthsBefore.push((await children.nth(i).boundingBox())!.width);
    }
    const totalWidthBefore = widthsBefore.reduce((a, b) => a + b, 0);

    // Étirement du composant du milieu : +80px de large, les frères rétrécissent
    const handle = children.nth(1).locator('[data-testid^="stretch-component-"]');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox!.x + 1, handleBox!.y + 10);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 81, handleBox!.y + 10, { steps: 5 });
    await page.mouse.up();

    const widthsAfter: number[] = [];
    for (let i = 0; i < 3; i++) {
      widthsAfter.push((await children.nth(i).boundingBox())!.width);
    }
    // Le composant étiré gagne ~80px
    expect(widthsAfter[1] - widthsBefore[1]).toBeGreaterThan(60);
    // La somme des largeurs est conservée (répartition, pas croissance)
    const totalWidthAfter = widthsAfter.reduce((a, b) => a + b, 0);
    expect(Math.abs(totalWidthAfter - totalWidthBefore)).toBeLessThan(6);
    // Les frères ont rétréci proportionnellement
    expect(widthsAfter[0]).toBeLessThan(widthsBefore[0] - 20);
    expect(widthsAfter[2]).toBeLessThan(widthsBefore[2] - 20);

    // Passage en vertical : les poids sont réinitialisés (nouvelle répartition)
    await section.locator('[data-testid^="sheet-section-edit-"]').first().click();
    await expect(modal).toBeVisible();
    await modal.getByTestId('sheet-config-layout-vertical').click();
    await modal.getByTestId('sheet-config-close').click();

    const heightsBefore: number[] = [];
    for (let i = 0; i < 3; i++) {
      heightsBefore.push((await children.nth(i).boundingBox())!.height);
    }
    const containerBoxBefore = await childrenContainer.boundingBox();
    expect(containerBoxBefore).not.toBeNull();

    // Étirement vertical du premier composant : +60px de haut
    const vHandle = children.nth(0).locator('[data-testid^="stretch-component-"]');
    const vHandleBox = await vHandle.boundingBox();
    expect(vHandleBox).not.toBeNull();
    await page.mouse.move(vHandleBox!.x + 10, vHandleBox!.y + 1);
    await page.mouse.down();
    await page.mouse.move(vHandleBox!.x + 10, vHandleBox!.y + 61, { steps: 5 });
    await page.mouse.up();

    const heightsAfter: number[] = [];
    for (let i = 0; i < 3; i++) {
      heightsAfter.push((await children.nth(i).boundingBox())!.height);
    }
    // Le composant étiré gagne ~60px, les frères rétrécissent
    expect(heightsAfter[0] - heightsBefore[0]).toBeGreaterThan(40);
    expect(heightsAfter[1]).toBeLessThan(heightsBefore[1] - 15);
    expect(heightsAfter[2]).toBeLessThan(heightsBefore[2] - 15);
    // La hauteur du conteneur est figée à sa hauteur d'origine
    const containerBoxAfter = await childrenContainer.boundingBox();
    expect(containerBoxAfter).not.toBeNull();
    expect(Math.abs(containerBoxAfter!.height - containerBoxBefore!.height)).toBeLessThan(6);

    // Enregistrement puis vérification sur la feuille de saisie :
    // la répartition (ratio des tailles) est conservée
    await page.getByRole('button', { name: /Créer la campagne/i }).first().click();
    await page.waitForURL(/\/forum\/\d+/, { timeout: 15000 });
    const campaignId = page.url().match(/\/forum\/(\d+)/)![1];

    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.getByRole('button', { name: /Nouveau personnage/i }).first().click();
    const fillArea = page.getByTestId('programmed-sheet-fill');
    await expect(fillArea).toBeVisible({ timeout: 10000 });

    const viewChildren = fillArea
      .locator('[data-testid^="sheet-view-children-"]')
      .first()
      .locator(':scope > div');
    await expect(viewChildren).toHaveCount(3);
    const viewHeights: number[] = [];
    for (let i = 0; i < 3; i++) {
      viewHeights.push((await viewChildren.nth(i).boundingBox())!.height);
    }
    // Les ratios de répartition verticale sont conservés
    const ratioBuilder = heightsAfter[0] / heightsAfter[1];
    const ratioView = viewHeights[0] / viewHeights[1];
    expect(Math.abs(ratioView - ratioBuilder)).toBeLessThan(0.1);
  });
});
