import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Fiche graphique multi-pages :
 * - chaque page a son propre fond (image / HTML) et ses propres champs ;
 * - les fiches mono-pages existantes restent éditables (repli historique).
 */

const runId = Date.now();
const MJ_USER = `e2egraphicmj${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Fiche Graphique Multi ${runId}`;
const CAMPAIGN_LEGACY_NAME = `E2E Fiche Graphique Mono ${runId}`;
const CHARACTER_NAME = `E2E Perso Graphique ${runId}`;

const FIELD_1 = `<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="2"></div><div class="ui-draggable JDRollDroppedUserControl" id="JDRollUserControl_1" style="position: absolute; top: 10px; left: 10px; width: 150px; height: 32px;"><a id="JDRollUserControlLink1_child" data-type="text" class="editable" style="background-color: rgba(0, 0, 0, 0);">Force</a></div>`;
const FIELD_2 = `<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="2"></div><div class="ui-draggable JDRollDroppedUserControl" id="JDRollUserControl_2" style="position: absolute; top: 20px; left: 20px; width: 150px; height: 32px;"><a id="JDRollUserControlLink2_child" data-type="text" class="editable" style="background-color: rgba(0, 0, 0, 0);">Objet</a></div>`;
const FIELD_LEGACY = `<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="1"></div><div class="ui-draggable JDRollDroppedUserControl" id="JDRollUserControl_1" style="position: absolute; top: 15px; left: 15px; width: 150px; height: 32px;"><a id="JDRollUserControlLink1_child" data-type="text" class="editable" style="background-color: rgba(0, 0, 0, 0);">Endurance</a></div>`;

const SHEET_PAGES = JSON.stringify({
  version: 1,
  pages: [
    {
      id: 'graphic-page-1',
      title: 'Identité',
      bgType: 'image',
      image: 'https://exemple.com/fiche.png',
      html: '',
      templateFields: FIELD_1,
    },
    {
      id: 'graphic-page-2',
      title: 'Inventaire',
      bgType: 'html',
      image: '',
      html: '<div>Fond Inventaire de test</div>',
      templateFields: FIELD_2,
    },
  ],
});

const PERSO_FIELDS = '<input type="hidden" id="JDRollUserControlLink1_child_hidden" value="12"><input type="hidden" id="JDRollUserControlLink2_child_hidden" value="Corde">';

let mjId: number;
let campaignId: number;
let campaignLegacyId: number;

function execSql(sql: string): void {
  execSync('docker exec -i jdroll-mysql mysql -uroot -proot jdroll', {
    input: `SET NAMES utf8;\n${sql}`,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}

function querySql(sql: string): string {
  // --raw : ne pas échapper les backslashes en sortie batch (JSON lisible)
  return execSync('docker exec -i jdroll-mysql mysql -uroot -proot jdroll -N -B --raw', {
    input: `SET NAMES utf8;\n${sql}`,
  })
    .toString()
    .trim();
}

function seed(): void {
  execSql(`
    INSERT INTO user (username, password, mail, description, titre) VALUES
      ('${MJ_USER}', MD5('${PASSWORD}'), '${MJ_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 0, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne multi-pages</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, sheet_mode, sheet_pages, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, 'https://exemple.com/fiche.png', '${FIELD_1.replace(/\\/g, '\\\\').replace(/'/g, "''")}', 'graphic', '${SHEET_PAGES.replace(/\\/g, '\\\\').replace(/'/g, "''")}', '[]', '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@mj_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '', '', 0, '${PERSO_FIELDS}', '[]');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 0, '${CAMPAIGN_LEGACY_NAME}', '', 'Test', 'Test', '<p>Campagne mono-page</p>', 0, 1);

    SET @camp_legacy_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_LEGACY_NAME}');

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, sheet_mode, widgets, width)
    VALUES (@camp_legacy_id, '', '', '#333333', NULL, 'https://exemple.com/fiche-mono.png', '${FIELD_LEGACY.replace(/\\/g, '\\\\').replace(/'/g, "''")}', 'graphic', '[]', '800px');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
  campaignLegacyId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_LEGACY_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM personnages WHERE campagne_id IN (${campaignId}, ${campaignLegacyId});
    DELETE FROM campagne_config WHERE campagne_id IN (${campaignId}, ${campaignLegacyId});
    DELETE FROM campagne WHERE id IN (${campaignId}, ${campaignLegacyId});
    DELETE FROM user WHERE id = ${mjId};
  `);
}

test.describe('Fiche graphique multi-pages', () => {
  test.beforeAll(() => {
    seed();
  });

  test.afterAll(() => {
    cleanup();
  });

  async function loginAsMj(page: import('@playwright/test').Page): Promise<void> {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await loginPage.navigate();
    await loginPage.login(MJ_USER, PASSWORD);
  }

  test('la fiche multi-pages affiche un onglet par page avec ses champs', async ({ page }) => {
    await loginAsMj(page);
    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.getByText(CHARACTER_NAME).first().click();
    await expect(page.locator('h3').filter({ hasText: 'Feuille de personnage' })).toBeVisible();

    // Onglets des pages
    const tabs = page.getByTestId('graphic-sheet-pages-tabs');
    await expect(tabs.getByRole('button', { name: 'Identité' })).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Inventaire' })).toBeVisible();

    // Page 1 : champ de la première page visible, valeur lue depuis perso_fields
    await expect(page.locator('#JDRollUserControl_1')).toBeVisible();
    await expect(page.locator('#JDRollUserControl_1')).toContainText('12');

    // Passage à la page 2 : fond HTML propre à la page et champ dédié
    await tabs.getByRole('button', { name: 'Inventaire' }).click();
    await expect(page.getByText('Fond Inventaire de test')).toBeVisible();
    await expect(page.locator('#JDRollUserControl_2')).toBeVisible();
    await expect(page.locator('#JDRollUserControl_2')).toContainText('Corde');
    await expect(page.locator('#JDRollUserControl_1')).toHaveCount(0);
  });

  async function openSheetTab(page: import('@playwright/test').Page): Promise<void> {
    await page.getByRole('button', { name: /Feuille de Personnage/i }).click();
    await expect(
      page.getByRole('heading', { name: /Feuille de Personnage Graphique Interactive/i })
    ).toBeVisible();
  }

  test("l'édition permet d'ajouter une page et de sauvegarder le document multi-pages", async ({ page }) => {
    await loginAsMj(page);
    await page.goto(`/campaigns/${campaignId}/edit`);
    await openSheetTab(page);
    // Les deux pages existantes sont proposées dans l'éditeur
    await expect(page.getByText('Pages de la fiche (2)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Identité' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inventaire' })).toBeVisible();

    // Ajout d'une troisième page
    await page.getByRole('button', { name: 'Ajouter une page' }).click();
    await expect(page.getByText('Pages de la fiche (3)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Page 3' })).toBeVisible();

    // Sauvegarde
    await page.getByRole('button', { name: /Enregistrer les modifications/i }).last().click();
    await expect(page).toHaveURL(new RegExp(`/forum/${campaignId}$`));

    // Le document multi-pages est persisté avec 3 pages
    const saved = querySql(`SELECT sheet_pages FROM campagne_config WHERE campagne_id = ${campaignId}`);
    const parsed = JSON.parse(saved);
    expect(parsed.version).toBe(1);
    expect(parsed.pages.length).toBe(3);
    expect(parsed.pages[0].title).toBe('Identité');
    expect(parsed.pages[1].title).toBe('Inventaire');
    expect(parsed.pages[2].title).toBe('Page 3');

    // Les colonnes historiques restent synchronisées sur la première page
    const legacyImg = querySql(`SELECT template_img FROM campagne_config WHERE campagne_id = ${campaignId}`);
    expect(legacyImg).toBe('https://exemple.com/fiche.png');
    const legacyFields = querySql(`SELECT template_fields FROM campagne_config WHERE campagne_id = ${campaignId}`);
    expect(legacyFields).toContain('JDRollUserControlLink1_child');
  });

  test('une fiche mono-page existante reste éditable et devient une page unique', async ({ page }) => {
    await loginAsMj(page);
    await page.goto(`/campaigns/${campaignLegacyId}/edit`);
    await openSheetTab(page);
    // Une seule page, reconstruite depuis les colonnes historiques
    await expect(page.getByText('Pages de la fiche (1)')).toBeVisible();

    // Le champ historique est chargé dans l'éditeur
    await expect(page.locator('.character-sheet-field')).toHaveCount(1);
    await expect(page.locator('.character-sheet-field')).toContainText('Endurance');

    // Sauvegarde sans modification : le champ est conservé dans le document
    await page.getByRole('button', { name: /Enregistrer les modifications/i }).last().click();
    await expect(page).toHaveURL(new RegExp(`/forum/${campaignLegacyId}$`));

    const saved = querySql(`SELECT sheet_pages FROM campagne_config WHERE campagne_id = ${campaignLegacyId}`);
    const parsed = JSON.parse(saved);
    expect(parsed.pages.length).toBe(1);
    expect(parsed.pages[0].templateFields).toContain('JDRollUserControlLink1_child');

    const legacyFields = querySql(`SELECT template_fields FROM campagne_config WHERE campagne_id = ${campaignLegacyId}`);
    expect(legacyFields).toContain('Endurance');
  });
});
