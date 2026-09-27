import { test, expect, Page } from '@playwright/test';

/**
 * Members list feature:
 * - GET /api/users is protected (401 without a token) and only returns
 *   users with at least one forum post
 * - /members is only accessible to authenticated users
 * - the entry button lives in the online panel of the authenticated home
 */

interface TestUser {
  username: string;
  token: string;
}

async function registerTestUser(page: Page): Promise<TestUser> {
  const username = `e2e_mbr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const response = await page.request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username}@test.local`,
      password: 'Passw0rd!123',
      website: '',
      elapsedMs: 10000,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return { username, token: body.token };
}

async function authenticatePage(page: Page, token: string) {
  await page.addInitScript((token: string) => {
    localStorage.setItem('jdroll_token', token);
  }, token);
}

test.describe('Members list', () => {
  test('GET /api/users is protected and excludes users without posts', async ({ request }) => {
    // Without a token, the endpoint must be refused
    const unauthenticated = await request.get('/api/users');
    expect(unauthenticated.status()).toBe(401);

    // With a token: a freshly registered user (0 posts) must not be listed
    const username = `e2e_mbr_api_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const register = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@test.local`,
        password: 'Passw0rd!123',
        website: '',
        elapsedMs: 10000,
      },
    });
    expect(register.ok()).toBeTruthy();
    const token = (await register.json()).token;

    const response = await request.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.members)).toBeTruthy();
    expect(body.members.some((member: { username: string }) => member.username === username)).toBe(false);
  });

  test('/members redirects anonymous visitors to the login page', async ({ page }) => {
    await page.goto('/members');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('authenticated home shows a members button in the online panel leading to the list', async ({ page }) => {
    const testUser = await registerTestUser(page);
    await authenticatePage(page, testUser.token);

    await page.goto('/');
    await expect(page.locator('[data-testid="home-stats-online"]')).toBeVisible({ timeout: 10000 });

    const membersButton = page.locator('[data-testid="home-stats-members-link"]');
    await expect(membersButton).toBeVisible();
    await membersButton.click();

    await expect(page).toHaveURL(/\/members$/);
    await expect(page.locator('[data-testid="members-page"]')).toBeVisible();
  });

  test('members page lists members returned by the API', async ({ page }) => {
    const testUser = await registerTestUser(page);
    await authenticatePage(page, testUser.token);

    await page.route('**/api/users', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [
            { id: 1, username: 'AlphaJoueur', avatar: '', profil: 0, titre: '', subscribeDate: '2026-01-10 12:00:00' },
            { id: 2, username: 'BetaMeneur', avatar: '', profil: 1, titre: 'Le Conteur', subscribeDate: '2026-02-20 08:30:00' },
          ],
        }),
      });
    });

    await page.goto('/members');
    await expect(page.locator('[data-testid="members-page"]')).toBeVisible({ timeout: 10000 });

    const items = page.locator('[data-testid="member-item"]');
    await expect(items).toHaveCount(2);
    await expect(page.locator('[data-testid="member-item"]', { hasText: 'AlphaJoueur' })).toBeVisible();
    await expect(page.locator('[data-testid="member-item"]', { hasText: 'BetaMeneur' })).toBeVisible();
  });

  test('members search field filters the displayed members', async ({ page }) => {
    const testUser = await registerTestUser(page);
    await authenticatePage(page, testUser.token);

    await page.route('**/api/users', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [
            { id: 1, username: 'AlphaJoueur', avatar: '', profil: 0, titre: '', subscribeDate: '2026-01-10 12:00:00', lastActionDate: null },
            { id: 2, username: 'BetaMeneur', avatar: '', profil: 1, titre: 'Le Conteur', subscribeDate: '2026-02-20 08:30:00', lastActionDate: null },
            { id: 3, username: 'alphaBis', avatar: '', profil: 0, titre: '', subscribeDate: '2026-03-15 10:00:00', lastActionDate: null },
          ],
        }),
      });
    });

    await page.goto('/members');
    await expect(page.locator('[data-testid="member-item"]')).toHaveCount(3);

    // Filtrage insensible à la casse, appliqué au pseudo
    const searchInput = page.locator('[data-testid="members-search"]');
    await searchInput.fill('alpha');
    await expect(page.locator('[data-testid="member-item"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="member-item"]', { hasText: 'BetaMeneur' })).toHaveCount(0);

    // Un filtre sans résultat affiche l'état vide
    await searchInput.fill('zzz');
    await expect(page.locator('[data-testid="member-item"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="members-empty"]')).toBeVisible();

    // Vider le champ restaure la liste complète
    await searchInput.fill('');
    await expect(page.locator('[data-testid="member-item"]')).toHaveCount(3);
  });

  test('members page shows an empty state when nobody has posted', async ({ page }) => {
    const testUser = await registerTestUser(page);
    await authenticatePage(page, testUser.token);

    await page.route('**/api/users', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [] }),
      });
    });

    await page.goto('/members');
    await expect(page.locator('[data-testid="members-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="member-item"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="members-empty"]')).toBeVisible();
  });
});
