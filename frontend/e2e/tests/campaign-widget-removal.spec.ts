import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Suppression d'un widget dans la configuration d'une campagne :
 * le widget retiré par le MJ ne doit plus rester visible sur les
 * personnages de la campagne (ni en base, ni à l'affichage).
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 */

const runId = Date.now();
const MJ_USER = `e2ewidgetmj${runId}`;
const OWNER_USER = `e2ewidgetowner${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Widgets Campagne ${runId}`;
const CHARACTER_NAME = `E2E Perso Widgets ${runId}`;
const WIDGET_VIE = 'E2EVie';
const WIDGET_OR = 'E2EOr';

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
    VALUES (@mj_id, 5, 1, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e widgets</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @owner_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, NULL,
      '[{"id":"w-vie","name":"${WIDGET_VIE}","type":"jauge","low":0,"up":100,"value":0},{"id":"w-or","name":"${WIDGET_OR}","type":"token","low":0,"up":0,"value":0}]',
      '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@owner_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '<p>Secret du personnage</p>', '<p>FOR 12</p>', 0, NULL,
      '[{"id":"w-vie","name":"${WIDGET_VIE}","type":"jauge","low":0,"up":100,"value":42},{"id":"w-or","name":"${WIDGET_OR}","type":"token","low":0,"up":0,"value":3}]');
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

test.describe('Suppression des widgets de campagne', () => {
  test.beforeAll(() => {
    seed();
  });

  test.afterAll(() => {
    cleanup();
  });

  test('un widget retiré de la campagne disparaît des personnages', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await loginPage.navigate();
    await loginPage.login(MJ_USER, PASSWORD);

    // Le MJ retire le widget "Or" de la configuration de la campagne
    await page.goto(`/campaigns/${campaignId}/edit`);
    await page.getByRole('button', { name: /Widgets/i }).click();

    const widgetList = page.locator('div.space-y-3').filter({ has: page.getByTitle('Supprimer') });
    const orRow = widgetList.locator('div.rounded-2xl').filter({ hasText: WIDGET_OR });
    await expect(orRow).toHaveCount(1);
    await orRow.getByTitle('Supprimer').click();

    await page.locator('form').getByRole('button', { name: /Enregistrer les modifications/i }).click();
    await page.waitForURL(new RegExp(`/forum/${campaignId}`));

    // Le widget retiré n'est plus stocké sur le personnage, l'autre garde sa valeur
    const charWidgets = querySql(`SELECT widgets FROM personnages WHERE id = ${characterId}`);
    expect(charWidgets).toContain('w-vie');
    expect(charWidgets).not.toContain('w-or');

    // Il n'est plus affiché sur la fiche du personnage
    await page.goto(`/campaigns/${campaignId}/characters`);
    await expect(page.getByText(CHARACTER_NAME).first()).toBeVisible();
    await expect(page.getByText(WIDGET_VIE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(WIDGET_OR, { exact: true })).toHaveCount(0);
  });
});
