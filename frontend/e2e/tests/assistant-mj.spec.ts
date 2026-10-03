import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Rôle de MJ Assistant (feature flip assistant-mj) :
 * - le MJ promeut un joueur depuis la configuration de la campagne ;
 * - l'assistant hérite des droits de jeu du MJ (PNJ privés, sujets privés) ;
 * - l'assistant n'a PAS accès à l'administration de la campagne
 *   (page de configuration, bouton « Configurer ») ;
 * - le MJ peut rétrograder l'assistant, qui perd alors ces droits.
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 * Le feature flip assistant-mj est activé pendant le test puis restauré.
 */

const runId = Date.now();
const MJ_USER = `e2easstmj${runId}`;
const PLAYER_USER = `e2easstplayer${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E MJ Assistant ${runId}`;
const PRIVATE_PNJ = `E2E PNJ Secret Assistant ${runId}`;
const PRIVATE_TOPIC = `E2E Sujet Privé Assistant ${runId}`;

let mjId: number;
let playerId: number;
let campaignId: number;
let originalFlagEnabled: number;

function execSql(sql: string): void {
  execSync('docker exec -i jdroll-mysql mysql --default-character-set=utf8mb4 -uroot -proot jdroll', {
    input: sql,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}

function querySql(sql: string): string {
  return execSync('docker exec -i jdroll-mysql mysql --default-character-set=utf8mb4 -uroot -proot jdroll -N -B', {
    input: sql,
  })
    .toString()
    .trim();
}

function seed(): void {
  originalFlagEnabled = Number(querySql(`SELECT enabled FROM feature_flip WHERE name = 'assistant-mj'`) || '0');
  execSql(`UPDATE feature_flip SET enabled = 1 WHERE name = 'assistant-mj'`);

  execSql(`
    INSERT INTO user (username, password, mail, description, titre) VALUES
      ('${MJ_USER}', MD5('${PASSWORD}'), '${MJ_USER}@example.com', '', ''),
      ('${PLAYER_USER}', MD5('${PASSWORD}'), '${PLAYER_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @player_id = (SELECT id FROM user WHERE username = '${PLAYER_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 2, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e MJ Assistant</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @player_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, NULL, '[]', '800px');

    INSERT INTO sections (campagne_id, title, ordre, default_collapse, banniere)
    VALUES (@camp_id, 'Section de test assistant', 1, 0, '');

    SET @section_id = (SELECT id FROM sections WHERE campagne_id = @camp_id LIMIT 1);

    INSERT INTO topics (section_id, last_post_id, title, stickable, is_private, ordre, is_closed)
    VALUES (@section_id, NULL, '${PRIVATE_TOPIC}', 0, 1, 1, 0);

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, widgets)
    VALUES (NULL, @camp_id, '${PRIVATE_PNJ}', 'PNJ caché', '', '<p>Description publique</p>', '<p>Secret du PNJ</p>', '', 1, '[]');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  playerId = Number(querySql(`SELECT id FROM user WHERE username = '${PLAYER_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM posts WHERE topic_id IN (SELECT id FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId}));
    DELETE FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId});
    DELETE FROM sections WHERE campagne_id = ${campaignId};
    DELETE FROM personnages WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${playerId});
    UPDATE feature_flip SET enabled = ${originalFlagEnabled} WHERE name = 'assistant-mj';
  `);
}

test.describe.serial('MJ Assistant (feature flip assistant-mj)', () => {
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

  async function loginAs(page: Page, username: string): Promise<void> {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await loginPage.navigate();
    await loginPage.login(username, PASSWORD);
  }

  test('le MJ promeut un joueur en MJ Assistant depuis la configuration', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await page.goto(`/campaigns/${campaignId}/edit`);

    // La gestion des participants se trouve dans l'onglet « Règles & Recrutement »
    await page.getByRole('button', { name: 'Règles & Recrutement' }).click();
    await expect(page.getByText('Gestion des participants')).toBeVisible({ timeout: 15000 });

    const playerRow = page.locator('div.flex', { hasText: PLAYER_USER }).filter({ has: page.getByRole('button', { name: 'MJ Assistant' }) }).first();
    await expect(playerRow).toBeVisible({ timeout: 15000 });
    await playerRow.getByRole('button', { name: 'MJ Assistant' }).click();

    // Après promotion : badge assistant sur la ligne + bouton de rétrogradation
    await expect(page.getByRole('button', { name: 'Rétrograder' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('span', { hasText: 'MJ Assistant' }).first()).toBeVisible();

    // Le statut en base est bien 2 (joueur validé + MJ Assistant)
    const statut = querySql(`SELECT statut FROM campagne_participant WHERE campagne_id = ${campaignId} AND user_id = ${playerId}`);
    expect(statut).toBe('2');
  });

  test('le MJ Assistant voit les PNJ privés comme le MJ', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await page.goto(`/campaigns/${campaignId}/characters`);

    await expect(page.getByText(PRIVATE_PNJ).first()).toBeVisible({ timeout: 15000 });
  });

  test('le MJ Assistant voit les sujets privés et le badge assistant, mais pas la configuration', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await page.goto(`/forum/${campaignId}`);

    await expect(page.getByText(PRIVATE_TOPIC).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Vous êtes MJ Assistant').first()).toBeVisible({ timeout: 15000 });

    // L'administration de la campagne reste réservée au MJ propriétaire
    await expect(page.getByRole('button', { name: 'Configurer' })).toHaveCount(0);
  });

  test('le MJ Assistant ne peut pas ouvrir la configuration de la campagne', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await page.goto(`/campaigns/${campaignId}/edit`);

    await expect(page.getByText("Vous n'êtes pas autorisé à modifier la configuration de cette campagne.")).toBeVisible({ timeout: 15000 });
  });

  test('le MJ rétrograde le MJ Assistant qui perd ses droits de jeu', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await page.goto(`/campaigns/${campaignId}/edit`);

    await page.getByRole('button', { name: 'Règles & Recrutement' }).click();

    const demoteButton = page.getByRole('button', { name: 'Rétrograder' });
    await expect(demoteButton).toBeVisible({ timeout: 15000 });
    await demoteButton.click();

    await expect(page.getByRole('button', { name: 'MJ Assistant' })).toBeVisible({ timeout: 15000 });

    const statut = querySql(`SELECT statut FROM campagne_participant WHERE campagne_id = ${campaignId} AND user_id = ${playerId}`);
    expect(statut).toBe('1');

    // Le joueur redevient un simple joueur : le PNJ privé redevient invisible
    await loginAs(page, PLAYER_USER);
    await page.goto(`/campaigns/${campaignId}/characters`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(PRIVATE_PNJ)).toHaveCount(0);
  });
});
