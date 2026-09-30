import { test, expect, devices, Locator, Page, APIRequestContext } from '@playwright/test';
import { execSync } from 'child_process';
import { buildSolidPng, seedCarte } from './helpers/carte-seed';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Exclusions du geste "swipe latéral ouvre la recherche flottante" :
 * le menu ne doit PAS s'ouvrir lorsque le swipe se produit dans une zone
 * où le geste horizontal est une interaction de contenu :
 * - le viewer de carte (pan de la carte) ;
 * - le carrousel de campagnes de la page d'accueil (défilement) ;
 * - une fiche de personnage (feuille / canvas).
 *
 * Un test de non-régression vérifie que le swipe sur une zone neutre
 * ouvre toujours le menu.
 */

test.use({ ...devices['Pixel 5'] });

const MODAL_TEXT = /Navigation rapide|Accès rapide/;
const SETTLE_MS = 400;

async function expectSearchOpen(page: Page): Promise<void> {
  await expect(page.getByText(MODAL_TEXT).first()).toBeVisible({ timeout: 5000 });
}

async function expectSearchClosed(page: Page): Promise<void> {
  await page.waitForTimeout(SETTLE_MS);
  await expect(page.getByText(MODAL_TEXT)).toHaveCount(0);
}

/**
 * Simule un swipe horizontal (un doigt, geste rapide) sur l'élément
 * désigné par le locator, en dispatchant des TouchEvent natifs.
 */
async function horizontalSwipe(locator: Locator, deltaX = -120): Promise<void> {
  await locator.evaluate((el, deltaX) => {
    const target = el as HTMLElement;
    const rect = target.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const endX = startX + deltaX;
    const endY = startY + 10;

    const fire = (type: string, points: Array<{ id: number; x: number; y: number }>) => {
      const list = points.map(
        (t) =>
          new Touch({
            identifier: t.id,
            target,
            clientX: t.x,
            clientY: t.y,
          })
      );
      target.dispatchEvent(
        new TouchEvent(type, {
          // touchend : plus aucun doigt actif, mais un changedTouch
          touches: type === 'touchend' ? [] : list,
          changedTouches: list,
          bubbles: true,
          cancelable: true,
        })
      );
    };

    fire('touchstart', [{ id: 1, x: startX, y: startY }]);
    const steps = 3;
    for (let i = 1; i <= steps; i++) {
      fire('touchmove', [
        {
          id: 1,
          x: startX + ((endX - startX) * i) / steps,
          y: startY + ((endY - startY) * i) / steps,
        },
      ]);
    }
    fire('touchend', [{ id: 1, x: endX, y: endY }]);
  }, deltaX);
}

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(
  request: APIRequestContext,
  username: string
): Promise<AuthResponse> {
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password: 'Password123',
      website: '',
      elapsedMs: 10000,
    },
  });
  if (!response.ok()) {
    throw new Error(`Échec de l'inscription de ${username} (${response.status()})`);
  }
  return response.json();
}

async function setBrowserToken(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => window.localStorage.setItem('jdroll_token', t), token);
}

// ---------------------------------------------------------------------------
// Seed SQL pour la fiche de personnage (même approche que
// character-sheet-rights.spec.ts)
// ---------------------------------------------------------------------------

const runId = Date.now();
const MJ_USER = `e2eswipemj${runId}`;
const OWNER_USER = `e2eswipeowner${runId}`;
const PASSWORD = 'password';
const CAMPAIGN_NAME = `E2E Swipe Fiche ${runId}`;
const CHARACTER_NAME = `E2E Perso Swipe ${runId}`;

let mjId: number;
let ownerId: number;
let sheetCampaignId: number;

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

function seedSheet(): void {
  execSql(`
    INSERT INTO user (username, password, mail, description, titre) VALUES
      ('${MJ_USER}', MD5('${PASSWORD}'), '${MJ_USER}@example.com', '', ''),
      ('${OWNER_USER}', MD5('${PASSWORD}'), '${OWNER_USER}@example.com', '', '');

    SET @mj_id = (SELECT id FROM user WHERE username = '${MJ_USER}');
    SET @owner_id = (SELECT id FROM user WHERE username = '${OWNER_USER}');

    INSERT INTO campagne (mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere, systeme, univers, description, statut, is_recrutement_open)
    VALUES (@mj_id, 5, 1, '${CAMPAIGN_NAME}', '', 'Test', 'Test', '<p>Campagne de test e2e</p>', 0, 0);

    SET @camp_id = (SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}');

    INSERT INTO campagne_participant (campagne_id, user_id, statut) VALUES
      (@camp_id, @owner_id, 1);

    INSERT INTO campagne_config (campagne_id, template, sidebar_text, link_sidebar_color, template_html, template_img, template_fields, widgets, width)
    VALUES (@camp_id, '', '', '#333333', NULL, NULL,
      '[{"id":"f1","type":"text","label":"PV","left":10,"top":10,"width":120,"height":24}]',
      '[]', '800px');

    INSERT INTO personnages (user_id, campagne_id, name, concept, avatar, publicDescription, privateDescription, technical, statut, perso_fields, widgets)
    VALUES (@owner_id, @camp_id, '${CHARACTER_NAME}', 'Testeur', '', '<p>Description publique</p>', '', '<p>FOR 12</p>', 0, '{"f1":"42"}', '[]');
  `);

  mjId = Number(querySql(`SELECT id FROM user WHERE username = '${MJ_USER}'`));
  ownerId = Number(querySql(`SELECT id FROM user WHERE username = '${OWNER_USER}'`));
  sheetCampaignId = Number(querySql(`SELECT id FROM campagne WHERE name = '${CAMPAIGN_NAME}'`));
}

function cleanupSheet(): void {
  execSql(`
    DELETE FROM personnages WHERE campagne_id = ${sheetCampaignId};
    DELETE FROM campagne_participant WHERE campagne_id = ${sheetCampaignId};
    DELETE FROM campagne_config WHERE campagne_id = ${sheetCampaignId};
    DELETE FROM campagne WHERE id = ${sheetCampaignId};
    DELETE FROM user WHERE id IN (${mjId}, ${ownerId});
  `);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Exclusions du swipe -> recherche flottante (mobile)', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('un swipe dans le viewer de carte n\'ouvre pas la recherche flottante', async ({
    page,
    request,
  }) => {
    const { campaignId, carteId } = await seedCarte(
      request,
      buildSolidPng(2000, 1400, [30, 90, 60]),
      'Carte swipe exclusion',
      { tabReduce: true }
    );

    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);
    await expect(page.locator('div.origin-top-left > img')).toBeVisible();
    await page.waitForTimeout(500);

    // Swipe horizontal sur le conteneur interactif de la carte
    await horizontalSwipe(page.locator('div.origin-top-left'), -120);

    await expectSearchClosed(page);
  });

  test('un swipe dans le carrousel de l\'accueil n\'ouvre pas la recherche flottante', async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const { token } = await registerUser(request, `e2e_swipe_${suffix}`);

    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Campagne carrousel swipe ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: '<p>Campagne en recrutement pour le carrousel</p>',
        nbJoueurs: 4,
        statut: 0,
        isRecrutementOpen: true,
      },
    });
    expect(createResponse.ok()).toBeTruthy();

    await setBrowserToken(page, token);
    await page.goto('/');

    const track = page.getByTestId('home-campaign-carousel-track');
    await expect(track).toBeVisible({ timeout: 10000 });

    await horizontalSwipe(track, -120);

    await expectSearchClosed(page);
  });

  test('un swipe dans une fiche de personnage n\'ouvre pas la recherche flottante', async ({
    page,
  }) => {
    seedSheet();

    try {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await page.evaluate(() => window.localStorage.clear());
      await loginPage.navigate();
      await loginPage.login(OWNER_USER, PASSWORD);

      await page.goto(`/campaigns/${sheetCampaignId}/characters`);
      await page.getByText(CHARACTER_NAME).first().click();
      const sheetHeading = page.locator('h3').filter({ hasText: 'Feuille de personnage' });
      await expect(sheetHeading).toBeVisible();

      // Le canvas de la fiche (conteneur défilable) est la cible du swipe :
      // il se trouve dans le div qui suit immédiatement le titre.
      const sheetCanvas = sheetHeading.locator(
        'xpath=following-sibling::div//div[contains(@class, "overflow-x-auto")]'
      );
      await expect(sheetCanvas).toBeVisible();

      await horizontalSwipe(sheetCanvas, -120);

      await expectSearchClosed(page);
    } finally {
      cleanupSheet();
    }
  });

  test('un swipe sur une zone neutre ouvre toujours la recherche flottante', async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const { token } = await registerUser(request, `e2e_neutral_${suffix}`);

    await setBrowserToken(page, token);
    await page.goto('/');

    const heroTitle = page.getByRole('heading', { name: /Bienvenue sur JdRoll/i, level: 1 });
    await expect(heroTitle).toBeVisible({ timeout: 10000 });

    await expectSearchClosed(page);

    await horizontalSwipe(heroTitle, -120);

    await expectSearchOpen(page);
  });
});
