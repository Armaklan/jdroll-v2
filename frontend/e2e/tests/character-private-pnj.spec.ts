import { test, expect, Page } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * PNJ privé (personnages.statut = 1) :
 * - invisible pour les joueurs dans la galerie et la recherche de campagne,
 * - visible pour le MJ (badge cadenas, toggle dans le formulaire),
 * - toujours utilisable par le MJ pour poster (sélecteur "poster en tant que").
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 */

const runId = Date.now();
const MJ_USER = `e2eprivmj${runId}`;
const PLAYER_USER = `e2eprivplayer${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E PNJ Privé ${runId}`;
const PUBLIC_PNJ = `E2E PNJ Public ${runId}`;
const PRIVATE_PNJ = `E2E PNJ Secret ${runId}`;
const TOPIC_TITLE = `E2E Topic Privé ${runId}`;

let mjId: number;
let playerId: number;
let campaignId: number;

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
  execSql(`
    INSERT INTO user (username, password, mail, description, titre) VALUES
      ('${MJ_USER}', MD5('${PASSWORD}'), '${MJ_USER}@example.com', '', ''),
      ('${PLAYER_USER}', MD5('${PASSWORD}'), '${PLAYER_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @player_id = (SELECT id FROM user WHERE username = '${PLAYER_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 1, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e pnj privé</p>', 0, 1);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @player_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, NULL, '[]', '800px');

    INSERT INTO sections (campagne_id, title, ordre, default_collapse, banniere)
    VALUES (@camp_id, 'Section de test', 1, 0, '');

    SET @section_id = (SELECT id FROM sections WHERE campagne_id = @camp_id LIMIT 1);

    INSERT INTO topics (section_id, last_post_id, title, stickable, is_private, ordre, is_closed)
    VALUES (@section_id, NULL, '${TOPIC_TITLE}', 0, 0, 1, 0);

    SET @topic_id = (SELECT id FROM topics WHERE section_id = @section_id LIMIT 1);

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, widgets)
    VALUES
      (NULL, @camp_id, '${PUBLIC_PNJ}', 'PNJ visible', '', '<p>Description publique</p>', '', '', 0, '[]'),
      (NULL, @camp_id, '${PRIVATE_PNJ}', 'PNJ caché', '', '<p>Description publique</p>', '<p>Secret du PNJ</p>', '', 1, '[]');

    SET @private_pnj_id = (SELECT id FROM personnages WHERE campagne_id = @camp_id AND name = '${PRIVATE_PNJ}');

    INSERT INTO posts (topic_id, user_id, perso_id, content, create_date, editor)
    VALUES (@topic_id, @mj_id, @private_pnj_id, '<p>Une rencontre avec [pnj=${PRIVATE_PNJ}]${PRIVATE_PNJ}[/pnj] au détour du chemin.</p>', NOW(), 0);
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  playerId = Number(querySql(`SELECT id FROM user WHERE username = '${PLAYER_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
}

function cleanup(): void {
  execSql(`
    DELETE FROM read_post WHERE topic_id IN (SELECT id FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId}));
    DELETE FROM posts WHERE topic_id IN (SELECT id FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId}));
    DELETE FROM personnages WHERE campagne_id = ${campaignId};
    DELETE FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId});
    DELETE FROM sections WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${playerId});
  `);
}

test.describe('PNJ privé (statut = 1)', () => {
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

  async function openGallery(page: Page): Promise<void> {
    await page.goto(`/campaigns/${campaignId}/characters`);
    await expect(page.getByText(PUBLIC_PNJ).first()).toBeVisible({ timeout: 15000 });
  }

  test('un joueur ne voit pas le PNJ privé dans la galerie', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await openGallery(page);

    await expect(page.getByText(PUBLIC_PNJ).first()).toBeVisible();
    await expect(page.getByText(PRIVATE_PNJ)).toHaveCount(0);
  });

  test('le MJ voit le PNJ privé dans la galerie avec un badge cadenas', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await openGallery(page);

    await expect(page.getByText(PUBLIC_PNJ).first()).toBeVisible();
    const privateCard = page.locator('div.group', { hasText: PRIVATE_PNJ }).first();
    await expect(privateCard).toBeVisible();
    await expect(privateCard.locator('span[title*="privé"]')).toBeVisible();
  });

  test('le MJ peut rendre un PNJ privé puis public depuis le formulaire', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await openGallery(page);

    // Rend le PNJ public privé via le formulaire
    const publicCard = page.locator('div.group', { hasText: PUBLIC_PNJ }).first();
    await publicCard.hover();
    await publicCard.getByRole('button', { name: 'Éditer ce personnage' }).click();

    const privateCheckbox = page.locator('form label:has-text("Personnage privé") input[type="checkbox"]');
    await expect(privateCheckbox).toBeVisible();
    await privateCheckbox.check();
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(page.locator('div.group', { hasText: PUBLIC_PNJ }).first().locator('span[title*="privé"]')).toBeVisible({ timeout: 15000 });

    // Retour à l'état public
    const card = page.locator('div.group', { hasText: PUBLIC_PNJ }).first();
    await card.hover();
    await card.getByRole('button', { name: 'Éditer ce personnage' }).click();
    await privateCheckbox.uncheck();
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(page.locator('div.group', { hasText: PUBLIC_PNJ }).first().locator('span[title*="privé"]')).toHaveCount(0, { timeout: 15000 });
  });

  test('la recherche de campagne ne retourne pas le PNJ privé pour un joueur', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await page.goto(`/forum/${campaignId}`);

    const searchButton = page.getByRole('button', { name: /Rechercher dans la campagne/ });
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();

    const searchInput = page.getByPlaceholder('Rechercher par nom (campagne, topic, carte, personnage)...');
    await searchInput.fill(PRIVATE_PNJ);
    await expect(page.getByTestId('floating-search-category-characters')).toHaveCount(0);

    await searchInput.fill(PUBLIC_PNJ);
    await expect(page.getByRole('button', { name: new RegExp(PUBLIC_PNJ) })).toBeVisible();
  });

  test('la recherche de campagne retourne le PNJ privé pour le MJ', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await page.goto(`/forum/${campaignId}`);

    const searchButton = page.getByRole('button', { name: /Rechercher dans la campagne/ });
    await expect(searchButton).toBeVisible({ timeout: 15000 });
    await searchButton.click();

    const searchInput = page.getByPlaceholder('Rechercher par nom (campagne, topic, carte, personnage)...');
    await searchInput.fill(PRIVATE_PNJ);
    await expect(page.getByRole('button', { name: new RegExp(PRIVATE_PNJ) })).toBeVisible();
  });

  test('le MJ peut toujours poster en tant que le PNJ privé', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await page.goto(`/forum/${campaignId}`);

    await page.getByRole('link', { name: TOPIC_TITLE }).click();
    const authorSelect = page.getByTestId('post-author-select');
    await expect(authorSelect).toBeVisible({ timeout: 15000 });
    await authorSelect.click();

    await expect(page.getByRole('option', { name: new RegExp(PRIVATE_PNJ) })).toBeVisible();
  });

  test('un joueur peut ouvrir le lien [pnj] vers le PNJ privé posté par le MJ', async ({ page }) => {
    await loginAs(page, PLAYER_USER);
    await page.goto(`/forum/${campaignId}`);

    await page.getByRole('link', { name: TOPIC_TITLE }).click();

    // Le post du MJ en tant que le PNJ privé est visible sur le post
    const postPnjLink = page.locator('a[data-pnj]', { hasText: PRIVATE_PNJ }).first();
    await expect(postPnjLink).toBeVisible({ timeout: 15000 });
    await postPnjLink.click();

    // La fiche du PNJ privé s'ouvre pour le joueur (infos publiques uniquement)
    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal.getByText(PRIVATE_PNJ).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Secret du PNJ')).toHaveCount(0);
  });
});
