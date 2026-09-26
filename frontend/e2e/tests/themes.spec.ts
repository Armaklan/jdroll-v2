import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests E2E - Application d'un thème pré-conçu à une campagne
 * Le MJ peut appliquer un thème stocké dans la table `theme`
 * (title = nom du thème, autres champs = couleurs à appliquer).
 */

const THEME_TITLE = 'Parchemin Médiéval';
const THEME_DIALOGUE_COLOR = '#1a5276';

interface TestUser {
  token: string;
  username: string;
  password: string;
}

async function createAndLoginUser(request: APIRequestContext, suffix: string): Promise<TestUser> {
  const username = `e2e_theme_${suffix}`;
  const password = 'ThemeTest123!';

  const registerRes = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username}@example.com`,
      password,
    },
  });
  expect(registerRes.ok()).toBeTruthy();

  const loginRes = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();

  return { token: body.token, username, password };
}

test.describe('Thème pré-conçu de campagne', () => {
  test('MJ peut appliquer un thème pré-conçu depuis le formulaire de campagne', async ({ page, request }) => {
    // Arrange: créer un MJ et injecter son token
    const user = await createAndLoginUser(request, `${Date.now()}_ui`);
    await page.addInitScript(
      (token: string) => localStorage.setItem('jdroll_token', token),
      user.token
    );

    // Act: ouvrir le formulaire de création et aller dans l'onglet Apparence
    await page.goto('/campaigns/new');
    await page.getByRole('button', { name: /Bannières & Apparence/i }).click();

    const themeSelect = page.getByTestId('predefined-theme-select');
    await expect(themeSelect).toBeVisible();

    // Le sélecteur propose au moins un thème pré-conçu
    const options = themeSelect.locator('option');
    expect(await options.count()).toBeGreaterThan(1);

    // Act: appliquer le thème pré-conçu
    await themeSelect.selectOption({ label: THEME_TITLE });

    // Assert: les champs de couleurs sont remplis avec les valeurs du thème
    const dialogueColorInput = page.locator('input[type="color"]').first();
    await expect(dialogueColorInput).toHaveValue(THEME_DIALOGUE_COLOR);
  });

  test('API: appliquer un thème met à jour les couleurs de la campagne', async ({ request }) => {
    // Arrange: un MJ avec sa campagne
    const user = await createAndLoginUser(request, `${Date.now()}_api`);
    const authHeaders = { Authorization: `Bearer ${user.token}` };

    const createRes = await request.post('/api/campaigns', {
      headers: authHeaders,
      data: { name: 'Campagne API Thème E2E' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { campaign } = await createRes.json();

    try {
      const themesRes = await request.get('/api/themes');
      expect(themesRes.ok()).toBeTruthy();
      const { themes } = await themesRes.json();
      const theme = themes.find((t: { title: string }) => t.title === THEME_TITLE);
      expect(theme).toBeTruthy();

      // Act: appliquer le thème
      const applyRes = await request.post(`/api/campaigns/${campaign.id}/theme`, {
        headers: authHeaders,
        data: { themeId: theme.id },
      });
      expect(applyRes.ok()).toBeTruthy();

      // Assert: les couleurs de la campagne correspondent au thème
      const updated = (await applyRes.json()).campaign;
      expect(updated.dialogueColor).toBe(THEME_DIALOGUE_COLOR);
      expect(updated.penseeColor).toBe(theme.penseeColor);
      expect(updated.rp1Color).toBe(theme.rp1Color);
      expect(updated.rp2Color).toBe(theme.rp2Color);
      expect(updated.quoteColor).toBe(theme.quoteColor);
      expect(updated.sidebarColor).toBe(theme.sidebarColor);
      expect(updated.oddLineColor).toBe(theme.oddLineColor);
      expect(updated.evenLineColor).toBe(theme.evenLineColor);
      expect(updated.textColor).toBe(theme.textColor);
      expect(updated.linkColor).toBe(theme.linkColor);
      expect(updated.linkSidebarColor).toBe(theme.linkSidebarColor);

      // Assert: un thème inexistant renvoie 404
      const badThemeRes = await request.post(`/api/campaigns/${campaign.id}/theme`, {
        headers: authHeaders,
        data: { themeId: 999999 },
      });
      expect(badThemeRes.status()).toBe(404);
    } finally {
      // Cleanup: supprimer la campagne de test
      await request.delete(`/api/campaigns/${campaign.id}`, { headers: authHeaders });
    }
  });

  test('API: un utilisateur non MJ ne peut pas appliquer un thème', async ({ request }) => {
    // Arrange: un MJ avec sa campagne, et un autre utilisateur
    const mj = await createAndLoginUser(request, `${Date.now()}_mj`);
    const other = await createAndLoginUser(request, `${Date.now()}_other`);
    const mjHeaders = { Authorization: `Bearer ${mj.token}` };

    const createRes = await request.post('/api/campaigns', {
      headers: mjHeaders,
      data: { name: 'Campagne MJ Only E2E' },
    });
    expect(createRes.ok()).toBeTruthy();
    const { campaign } = await createRes.json();

    try {
      const themesRes = await request.get('/api/themes');
      const { themes } = await themesRes.json();
      const theme = themes.find((t: { title: string }) => t.title === THEME_TITLE);
      expect(theme).toBeTruthy();

      // Act: un utilisateur qui n'est pas MJ tente d'appliquer un thème
      const applyRes = await request.post(`/api/campaigns/${campaign.id}/theme`, {
        headers: { Authorization: `Bearer ${other.token}` },
        data: { themeId: theme.id },
      });

      // Assert: refus
      expect(applyRes.status()).toBe(403);
    } finally {
      await request.delete(`/api/campaigns/${campaign.id}`, { headers: mjHeaders });
    }
  });
});
