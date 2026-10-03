import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * MJ Assistant et mode administration du forum (bouton « Administrer ») :
 * le MJ Assistant (feature flip assistant-mj) peut éditer les sections
 * (création, modification) et les sujets (renommage) comme le MJ,
 * sans avoir accès à la configuration de la campagne.
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 * Le feature flip assistant-mj est activé pendant le test puis restauré.
 */

const runId = Date.now();
const MJ_USER = `e2eadmmjmj${runId}`;
const ASSISTANT_USER = `e2eadmjasst${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Admin Mode Assistant ${runId}`;
const SECTION_TITLE = `E2E Section Admin ${runId}`;
const TOPIC_TITLE = `E2E Sujet Admin ${runId}`;
const NEW_SECTION_TITLE = `E2E Nouvelle Section ${runId}`;
const RENAMED_TOPIC_TITLE = `E2E Sujet Renommé ${runId}`;

let mjId: number;
let assistantId: number;
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
      ('${ASSISTANT_USER}', MD5('${PASSWORD}'), '${ASSISTANT_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @assistant_id = (SELECT id FROM user WHERE username = '${ASSISTANT_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 2, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e admin mode assistant</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @assistant_id, 2);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, NULL, '[]', '800px');

    INSERT INTO sections (campagne_id, title, ordre, default_collapse, banniere)
    VALUES (@camp_id, '${SECTION_TITLE}', 1, 0, '');

    SET @section_id = (SELECT id FROM sections WHERE campagne_id = @camp_id LIMIT 1);

    INSERT INTO topics (section_id, last_post_id, title, stickable, is_private, ordre, is_closed)
    VALUES (@section_id, NULL, '${TOPIC_TITLE}', 0, 0, 1, 0);
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  assistantId = Number(querySql(`SELECT id FROM user WHERE username = '${ASSISTANT_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId});
    DELETE FROM sections WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${assistantId});
    UPDATE feature_flip SET enabled = ${originalFlagEnabled} WHERE name = 'assistant-mj';
  `);
}

test.describe.serial('MJ Assistant : mode administration du forum', () => {
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

  async function openForumInAdminMode(page: Page): Promise<void> {
    await page.goto(`/forum/${campaignId}`);
    const adminButton = page.getByRole('button', { name: 'Administrer' });
    await expect(adminButton).toBeVisible({ timeout: 15000 });
    await adminButton.click();
    await expect(page.getByText('Administration de la Campagne').first()).toBeVisible({ timeout: 15000 });
  }

  test('le MJ Assistant voit et ouvre le mode administration du forum', async ({ page }) => {
    await loginAs(page, ASSISTANT_USER);
    await openForumInAdminMode(page);

    await expect(page.getByRole('button', { name: 'Ne plus administrer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer une section' })).toBeVisible();
    // La configuration de la campagne reste réservée au MJ propriétaire
    await expect(page.getByRole('button', { name: 'Configurer' })).toHaveCount(0);
  });

  test('le MJ Assistant crée une section depuis le mode administration', async ({ page }) => {
    await loginAs(page, ASSISTANT_USER);
    await openForumInAdminMode(page);

    await page.getByRole('button', { name: 'Créer une section' }).click();
    const titleInput = page.getByPlaceholder('Ex : Actes de jeu, Taverne HRP...');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(NEW_SECTION_TITLE);
    await page.locator('form').filter({ has: titleInput }).getByRole('button', { name: 'Créer la section' }).click();

    await expect(page.getByText(NEW_SECTION_TITLE).first()).toBeVisible({ timeout: 15000 });

    const sectionCount = querySql(`SELECT COUNT(*) FROM sections WHERE campagne_id = ${campaignId} AND title = '${NEW_SECTION_TITLE}'`);
    expect(sectionCount).toBe('1');
  });

  test('le MJ Assistant édite un sujet depuis le mode administration', async ({ page }) => {
    await loginAs(page, ASSISTANT_USER);
    await openForumInAdminMode(page);

    await expect(page.getByText(TOPIC_TITLE).first()).toBeVisible();
    await page.locator('button[title="Éditer ce sujet"]').click();

    const titleInput = page.getByPlaceholder("Ex : Chapitre 1 : L'Auberge maudite");
    await expect(titleInput).toBeVisible();
    await titleInput.fill(RENAMED_TOPIC_TITLE);
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

    await expect(page.getByText(RENAMED_TOPIC_TITLE).first()).toBeVisible({ timeout: 15000 });

    const topicCount = querySql(`SELECT COUNT(*) FROM topics WHERE title = '${RENAMED_TOPIC_TITLE}'`);
    expect(topicCount).toBe('1');
  });

  test('le MJ Assistant édite une section depuis le mode administration', async ({ page }) => {
    const NEW_TITLE = `E2E Section Renommée ${runId}`;
    await loginAs(page, ASSISTANT_USER);
    await openForumInAdminMode(page);

    const sectionCard = page.locator('div.relative.bg-white', { hasText: SECTION_TITLE }).first();
    await expect(sectionCard).toBeVisible({ timeout: 15000 });
    await sectionCard.locator('button[title="Éditer cette section"]').click();

    const titleInput = page.getByPlaceholder('Ex : Actes de jeu, Taverne HRP...');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(NEW_TITLE);
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

    await expect(page.getByText(NEW_TITLE).first()).toBeVisible({ timeout: 15000 });
  });
});
