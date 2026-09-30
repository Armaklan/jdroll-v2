import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Bouton "Éditer" de la fiche de personnage en visualisation :
 * - visible uniquement pour le MJ ou le joueur propriétaire du personnage
 * - un vrai lien <a href> ouvrable dans la fenêtre courante ou en nouvel onglet
 *   (l'URL ?char=<id>&edit=1 ouvre directement le personnage en édition)
 *
 * Données seedées directement en base (docker jdroll-mysql), nettoyées après.
 */

const runId = Date.now();
const MJ_USER = `e2eeditmj${runId}`;
const OWNER_USER = `e2eeditowner${runId}`;
const OTHER_USER = `e2eeditother${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Edit Lien ${runId}`;
const CHARACTER_NAME = `E2E Perso Edit ${runId}`;

let mjId: number;
let ownerId: number;
let otherId: number;
let campaignId: number;
let characterId: number;
let topicId: number;

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
    VALUES (@camp_id, '', '', '#333333', NULL, NULL, '[]', '[]', '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@owner_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '<p>Secret du personnage</p>', '<p>FOR 12</p>', 0, '{}', '[]');

    SET @perso_id = LAST_INSERT_ID();

    INSERT INTO sections (campagne_id, title, ordre, default_collapse)
    VALUES (@camp_id, 'Section E2E Edit', 1, 0);
    SET @section_id = LAST_INSERT_ID();

    INSERT INTO topics (section_id, title, stickable, ordre)
    VALUES (@section_id, 'Sujet E2E Edit ${runId}', 0, 1);
    SET @topic_id = LAST_INSERT_ID();

    INSERT INTO posts (topic_id, user_id, perso_id, content)
    VALUES (@topic_id, @owner_id, @perso_id, '<p>Message de test e2e</p>');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  ownerId = Number(querySql(`SELECT id FROM user WHERE username = '${OWNER_USER}'`));
  otherId = Number(querySql(`SELECT id FROM user WHERE username = '${OTHER_USER}'`));
  campaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
  characterId = Number(
    querySql(`SELECT id FROM personnages WHERE campagne_id = ${campaignId} AND name = '${CHARACTER_NAME}'`)
  );
  topicId = Number(
    querySql(`SELECT id FROM topics WHERE section_id IN (SELECT id FROM sections WHERE campagne_id = ${campaignId})`)
  );
}

function cleanup(): void {
  execSql(`
    DELETE FROM read_post WHERE topic_id = ${topicId};
    DELETE FROM draft WHERE topic_id = ${topicId};
    DELETE FROM posts WHERE topic_id = ${topicId};
    DELETE FROM topics WHERE id = ${topicId};
    DELETE FROM sections WHERE campagne_id = ${campaignId};
    DELETE FROM personnages WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${campaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${campaignId};
    DELETE FROM campagne WHERE id = ${campaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${ownerId}, ${otherId});
  `);
}

const editLinkHref = () => `/campaigns/${campaignId}/characters?char=${characterId}&edit=1`;

function editFormHeading(page: import('@playwright/test').Page) {
  return page.locator('h2').filter({ hasText: `Éditer : ${CHARACTER_NAME}` });
}

test.describe('Bouton Éditer de la fiche de personnage', () => {
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

  async function openCharacterModalFromTopic(page: import('@playwright/test').Page): Promise<void> {
    await page.goto(`/forum/${campaignId}/${topicId}`);
    await page
      .locator(`h4[title="Voir la fiche de ${CHARACTER_NAME}"]`)
      .first()
      .click();
    await expect(page.locator('h2').filter({ hasText: CHARACTER_NAME })).toBeVisible();
  }

  test('le MJ voit un lien Éditer qui ouvre le personnage en édition (même fenêtre)', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await openCharacterModal(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();
    await expect(editLink).toContainText('Éditer');

    // Act: clic normal -> édition dans la fenêtre courante
    await editLink.click();

    // Assert: le formulaire d'édition du personnage est ouvert
    await expect(editFormHeading(page)).toBeVisible();
  });

  test('le joueur propriétaire voit le lien Éditer et ouvre le personnage en édition', async ({ page }) => {
    await loginAs(page, OWNER_USER);
    await openCharacterModal(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();

    await editLink.click();

    await expect(editFormHeading(page)).toBeVisible();
  });

  test('un joueur non propriétaire ne voit pas le lien Éditer', async ({ page }) => {
    await loginAs(page, OTHER_USER);
    await openCharacterModal(page);

    await expect(page.locator(`a[href="${editLinkHref()}"]`)).toHaveCount(0);
  });

  test('ctrl+clic sur le lien Éditer ouvre le personnage en édition dans un nouvel onglet', async ({
    page,
    context,
  }) => {
    await loginAs(page, MJ_USER);
    await openCharacterModal(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();

    // Act: ctrl+clic sur le lien
    const newPagePromise = context.waitForEvent('page');
    await editLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre, le personnage est directement en édition
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');
    await expect(newPage).toHaveURL(new RegExp(`/campaigns/${campaignId}/characters\\?char=${characterId}`));
    await expect(editFormHeading(newPage)).toBeVisible();
  });

  test('le MJ voit le lien Éditer dans la modale ouverte depuis un sujet du forum (même fenêtre)', async ({ page }) => {
    await loginAs(page, MJ_USER);
    await openCharacterModalFromTopic(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();

    // Act: clic normal -> navigation vers la galerie avec le personnage en édition
    await editLink.click();

    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/characters\\?char=${characterId}`));
    await expect(editFormHeading(page)).toBeVisible();
  });

  test('le joueur propriétaire voit le lien Éditer dans la modale ouverte depuis un sujet du forum', async ({ page }) => {
    await loginAs(page, OWNER_USER);
    await openCharacterModalFromTopic(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();

    await editLink.click();

    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaignId}/characters\\?char=${characterId}`));
    await expect(editFormHeading(page)).toBeVisible();
  });

  test('un joueur non propriétaire ne voit pas le lien Éditer dans la modale du forum', async ({ page }) => {
    await loginAs(page, OTHER_USER);
    await openCharacterModalFromTopic(page);

    await expect(page.locator(`a[href="${editLinkHref()}"]`)).toHaveCount(0);
  });

  test('ctrl+clic sur le lien Éditer du forum ouvre le personnage en édition dans un nouvel onglet', async ({
    page,
    context,
  }) => {
    await loginAs(page, MJ_USER);
    await openCharacterModalFromTopic(page);

    const editLink = page.locator(`a[href="${editLinkHref()}"]`);
    await expect(editLink).toBeVisible();

    // Act: ctrl+clic sur le lien
    const newPagePromise = context.waitForEvent('page');
    await editLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre, le personnage est directement en édition
    const newPage = await newPagePromise;
    await newPage.waitForLoadState('domcontentloaded');
    await expect(newPage).toHaveURL(new RegExp(`/campaigns/${campaignId}/characters\\?char=${characterId}`));
    await expect(editFormHeading(newPage)).toBeVisible();
  });
});
