import { test, expect, APIRequestContext } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';

/**
 * Tests E2E des annonces éditoriales (table annonce)
 * 1. Un admin peut créer une annonce depuis le menu Administration (titre + wysiwyg + date de fin)
 * 2. Les annonces visibles (entre create_date et end_date) s'affichent en haut de l'accueil
 *    et du forum général pour les utilisateurs authentifiés
 * 3. Un admin peut modifier une annonce, le changement est visible sur l'accueil
 * 4. Un utilisateur authentifié non admin voit les annonces mais ne peut pas les gérer (403 API)
 *
 * Le filtrage strict de la fenêtre create_date/end_date est couvert par les tests unitaires
 * backend (src/queries/annonce.queries.test.ts et src/repositories/annonce.repository.ts) :
 * impossible de créer une annonce déjà expirée via l'API.
 *
 * Comptes de seed : admin/password (profil 2), testuser/password (profil 0)
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function loginViaApi(request: APIRequestContext, username: string, password: string): Promise<AuthResponse> {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  if (!response.ok()) {
    throw new Error(`Échec du login de ${username} (${response.status})`);
  }
  return response.json();
}

async function setBrowserToken(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('jdroll_token', t);
  }, token);
}

function mysqlDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function createAnnonceViaApi(
  request: APIRequestContext,
  token: string,
  title: string,
  content: string,
  endDate: Date
): Promise<{ id: number }> {
  const response = await request.post('/api/annonces', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      content,
      endDate: mysqlDateTime(endDate),
    },
  });
  if (!response.ok()) {
    throw new Error(`Échec de la création de l'annonce (${response.status}): ${await response.text()}`);
  }
  const body = await response.json();
  return body.annonce;
}

test.describe('Annonces', () => {
  test("un admin crée une annonce depuis l'Administration, visible sur l'accueil et le forum général", async ({ page }) => {
    const suffix = `${Date.now().toString(36)}`;
    const title = `Annonce E2E ${suffix}`;
    const content = `<p>Contenu de l'annonce <b>e2e-${suffix}</b></p>`;

    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.login('admin', 'password');
    await expect(page).toHaveURL('/');

    // Création depuis l'écran d'administration
    await page.goto('/administration');
    await page.getByTestId('new-annonce-button').click();

    await page.getByTestId('annonce-title-input').fill(title);
    const editor = page.locator('div[contenteditable="true"]').first();
    await editor.click();
    await editor.type(`Contenu de l'annonce e2e-${suffix}`);

    // Date de fin : demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const endValue = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T12:00`;
    await page.getByTestId('annonce-end-date-input').fill(endValue);

    await page.getByTestId('annonce-save-button').click();

    // L'annonce apparaît dans la liste d'administration avec le statut Visible
    const row = page.locator('li', { hasText: title }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Visible');

    // L'annonce est visible en haut de la page d'accueil
    await page.goto('/');
    const banner = page.getByTestId('annonces-banner');
    await expect(banner).toBeVisible();
    await expect(banner.locator('section', { hasText: title })).toBeVisible();
    await expect(banner.locator('section', { hasText: title })).toContainText(`e2e-${suffix}`);

    // L'annonce est visible en haut du forum général
    await page.goto('/forum/0');
    const forumBanner = page.getByTestId('annonces-banner');
    await expect(forumBanner.locator('section', { hasText: title })).toBeVisible();
  });

  test('un admin modifie une annonce, le changement est visible sur l\'accueil', async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}`;
    const initialTitle = `Annonce E2E avant ${suffix}`;
    const updatedTitle = `Annonce E2E apres ${suffix}`;

    const admin = await loginViaApi(request, 'admin', 'password');
    const inOneHour = new Date();
    inOneHour.setHours(inOneHour.getHours() + 1);
    const annonce = await createAnnonceViaApi(request, admin.token, initialTitle, '<p>Contenu initial</p>', inOneHour);

    await setBrowserToken(page, admin.token);
    await page.goto('/administration');

    // Modification du titre depuis l'écran d'administration
    const row = page.locator('li', { hasText: initialTitle }).first();
    await row.getByRole('button', { name: /Modifier/i }).click();

    await page.getByTestId('annonce-title-input').fill(updatedTitle);
    await page.getByTestId('annonce-save-button').click();

    await expect(page.locator('li', { hasText: updatedTitle }).first()).toBeVisible();

    // Le nouveau titre est affiché sur l'accueil, plus l'ancien
    await page.goto('/');
    const banner = page.getByTestId('annonces-banner');
    await expect(banner.locator('section', { hasText: updatedTitle })).toBeVisible();
    await expect(banner.locator('section', { hasText: initialTitle })).toHaveCount(0);

    // La date de fin reste celle définie à la création
    const listResponse = await request.get('/api/annonces', {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const updated = listBody.annonces.find((a: { id: number }) => a.id === annonce.id);
    expect(updated).toBeTruthy();
    expect(updated.title).toBe(updatedTitle);
    expect(Date.parse(updated.endDate.replace(' ', 'T'))).toBeGreaterThan(Date.now() - 5 * 60 * 1000);
  });

  test("un utilisateur authentifié non admin voit les annonces mais ne peut pas les gérer", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}`;
    const title = `Annonce E2E joueur ${suffix}`;

    const admin = await loginViaApi(request, 'admin', 'password');
    const inOneHour = new Date();
    inOneHour.setHours(inOneHour.getHours() + 1);
    await createAnnonceViaApi(request, admin.token, title, '<p>Pour les joueurs</p>', inOneHour);

    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.login('testuser', 'password');
    await expect(page).toHaveURL('/');

    // L'utilisateur authentifié voit l'annonce sur l'accueil
    const banner = page.getByTestId('annonces-banner');
    await expect(banner.locator('section', { hasText: title })).toBeVisible();

    // Mais l'API de gestion lui est interdite
    const user = await loginViaApi(request, 'testuser', 'password');
    const listResponse = await request.get('/api/annonces', {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect(listResponse.status()).toBe(403);

    const createResponse = await request.post('/api/annonces', {
      headers: { Authorization: `Bearer ${user.token}` },
      data: { title: 'Interdit', content: '<p>Interdit</p>', endDate: mysqlDateTime(inOneHour) },
    });
    expect(createResponse.status()).toBe(403);

    // L'utilisateur non authentifié ne voit pas non plus les annonces
    const anonymousResponse = await request.get('/api/annonces/visible');
    expect(anonymousResponse.status()).toBe(401);
  });
});
