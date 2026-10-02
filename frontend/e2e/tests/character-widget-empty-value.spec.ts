import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Valeurs de widgets vides sur une fiche de personnage :
 * - un widget dont aucune valeur n'est saisie ne doit pas être affiché
 * - le propriétaire peut vider la valeur d'un widget depuis la fiche,
 *   le widget disparaît alors de l'affichage mais reste configuré en base
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 */

const runId = Date.now();
const MJ_USER = `e2ewidgtemptymj${runId}`;
const OWNER_USER = `e2ewidgtemptyowner${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Widgets Vidage ${runId}`;
const CHARACTER_NAME = `E2E Perso Widgets Vidage ${runId}`;
const WIDGET_PV = 'E2EPVide';
const WIDGET_OR = 'E2EOrVide';
const WIDGET_NOTE = 'E2ENoteVide';

let mjId: number;
let ownerId: number;
let campaignId: number;
let characterId: number;

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
      ('${OWNER_USER}', MD5('${PASSWORD}'), '${OWNER_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @owner_id = (SELECT id FROM user WHERE username = '${OWNER_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 1, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e widgets vidage</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @owner_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, NULL,
      '[{"id":"w-pv","name":"${WIDGET_PV}","type":"jauge","low":0,"up":100,"value":100},{"id":"w-or","name":"${WIDGET_OR}","type":"token","low":0,"up":0,"value":0},{"id":"w-note","name":"${WIDGET_NOTE}","type":"text","low":0,"up":0,"value":"En forme"}]',
      '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@owner_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '<p>Secret du personnage</p>', '<p>FOR 12</p>', 0, NULL,
      '[{"id":"w-pv","name":"${WIDGET_PV}","type":"jauge","low":0,"up":100,"value":42},{"id":"w-or","name":"${WIDGET_OR}","type":"token","low":0,"up":0,"value":3},{"id":"w-note","name":"${WIDGET_NOTE}","type":"text","low":0,"up":0,"value":""}]');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  ownerId = Number(querySql(`SELECT id FROM user WHERE username = '${OWNER_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
  characterId = Number(querySql(`SELECT id FROM personnages WHERE name = '${CHARACTER_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM personnages WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${ownerId});
  `);
}

test.describe('Vidage des valeurs de widgets sur une fiche de personnage', () => {
  let loginPage: LoginPage;

  test.beforeAll(() => {
    seed();
  });

  test.afterAll(() => {
    cleanup();
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await loginPage.navigate();
    await loginPage.login(OWNER_USER, PASSWORD);
  });

  test("un widget sans valeur saisie n'est pas affiché sur la fiche", async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/characters`);
    await expect(page.getByText(CHARACTER_NAME).first()).toBeVisible();

    // Les widgets avec valeur sont affichés
    await expect(page.getByText(WIDGET_PV, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(WIDGET_OR, { exact: true }).first()).toBeVisible();

    // Le widget texte sans valeur saisie n'est pas affiché
    await expect(page.getByText(WIDGET_NOTE)).toHaveCount(0);
  });

  test('le propriétaire peut vider la valeur d\'un widget depuis la fiche, le widget disparaît', async ({ page }) => {
    await page.goto(`/campaigns/${campaignId}/characters?char=${characterId}&edit=1`);
    await expect(page.locator('h2').filter({ hasText: `Éditer : ${CHARACTER_NAME}` })).toBeVisible();

    // Vider la valeur actuelle de la jauge
    const pvValueInput = page.getByPlaceholder('Valeur', { exact: true });
    await expect(pvValueInput).toHaveValue('42');
    await pvValueInput.fill('');

    await page.getByRole('button', { name: /Enregistrer les modifications/i }).click();
    await expect(page.getByText('a été mis à jour avec succès', { exact: false })).toBeVisible({ timeout: 15000 });

    // La valeur vidée est bien persistée (le widget reste configuré avec une valeur vide)
    const charWidgets = querySql(`SELECT widgets FROM personnages WHERE id = ${characterId}`);
    expect(charWidgets).toContain('w-pv');
    expect(charWidgets).toContain('"value":""');

    // Le widget vidé n'est plus affiché sur la fiche du personnage
    await page.goto(`/campaigns/${campaignId}/characters`);
    await expect(page.getByText(CHARACTER_NAME).first()).toBeVisible();
    await expect(page.getByText(WIDGET_PV)).toHaveCount(0);

    // Les autres widgets restent affichés
    await expect(page.getByText(WIDGET_OR, { exact: true }).first()).toBeVisible();
  });
});
