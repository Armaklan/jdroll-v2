import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Droits d'affichage de la "Feuille de personnage"
 * Seuls le MJ et le joueur propriétaire du personnage peuvent la voir,
 * comme pour la description privée / fiche technique.
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 */

const runId = Date.now();
const MJ_USER = `e2esheetmj${runId}`;
const OWNER_USER = `e2esheetowner${runId}`;
const OTHER_USER = `e2esheetother${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Droits Feuille ${runId}`;
const CHARACTER_NAME = `E2E Perso Feuille ${runId}`;

let mjId: number;
let ownerId: number;
let otherId: number;
let campaignId: number;

function execSql(sql: string): void {
  execSync('docker exec -i jdroll-mysql mysql -uroot -proot jdroll', {
    input: sql,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}

function querySql(sql: string): string {
  return execSync('docker exec -i jdroll-mysql mysql -uroot -proot jdroll -N -B', {
    input: sql,
  })
    .toString()
    .trim();
}

function seed(): void {
  execSql(`
    INSERT INTO user (username, password, mail, description, titre) VALUES
      ('${MJ_USER}', MD5('${PASSWORD}'), '${MJ_USER}@example.com', '', ''),
      ('${OWNER_USER}', MD5('${PASSWORD}'), '${OWNER_USER}@example.com', '', ''),
      ('${OTHER_USER}', MD5('${PASSWORD}'), '${OTHER_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @owner_id = (SELECT id FROM user WHERE username = '${OWNER_USER}');
    SET @other_id = (SELECT id FROM user WHERE username = '${OTHER_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 2, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @owner_id, 1),
      (@camp_id, @other_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL,
      '[{"id":"f1","type":"text","label":"PV","left":10,"top":10,"width":120,"height":24}]',
      '[]', '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@owner_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '<p>Secret du personnage</p>', '<p>FOR 12</p>', 0, '{"f1":"42"}', '[]');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  ownerId = Number(querySql(`SELECT id FROM user WHERE username = '${OWNER_USER}'`));
  otherId = Number(querySql(`SELECT id FROM user WHERE username = '${OTHER_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM personnages WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${ownerId}, ${otherId});
  `);
}

test.describe('Droits de la feuille de personnage', () => {
  let loginPage: LoginPage;

  test.beforeAll(() => {
    seed();
  });

  test.afterAll(() => {
    cleanup();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  async function loginAs(page: import('@playwright/test').Page, username: string): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await loginPage.navigate();
    await loginPage.login(username, PASSWORD);
  }

  async function openCharacterModal(page: import('@playwright/test').Page): Promise<void> {
    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.getByText(CHARACTER_NAME).first().click();
    await expect(page.locator('h3').filter({ hasText: 'Description publique' })).toBeVisible();
  }

  const sheetHeading = (page: import('@playwright/test').Page) =>
    page.locator('h3').filter({ hasText: 'Feuille de personnage' });
  const privateHeading = (page: import('@playwright/test').Page) =>
    page.locator('h3').filter({ hasText: 'Notes privées / Secrets' });

  test('un joueur non propriétaire ne voit pas la feuille de personnage', async ({ page }) => {
    await loginAs(page, OTHER_USER);
    await openCharacterModal(page);

    await expect(sheetHeading(page)).toHaveCount(0);
    await expect(privateHeading(page)).toHaveCount(0);
  });

  test('le joueur propriétaire voit la feuille de personnage', async ({ page }) => {
    await loginAs(page, OWNER_USER);
    await openCharacterModal(page);

    await expect(sheetHeading(page).first()).toBeVisible();
    await expect(privateHeading(page).first()).toBeVisible();
  });

  test('le MJ voit la feuille de personnage', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await openCharacterModal(page);

    await expect(sheetHeading(page).first()).toBeVisible();
    await expect(privateHeading(page).first()).toBeVisible();
  });
});
