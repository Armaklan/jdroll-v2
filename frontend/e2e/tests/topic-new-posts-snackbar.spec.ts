import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Snackbar "nouveaux messages" pendant la lecture d'un sujet
 *
 * Le front maintient une connexion WebSocket (/api/topics/ws) pendant la
 * lecture d'un sujet. Quand un autre utilisateur poste un message (ou un jet
 * de dés) dans ce sujet, une snackbar s'affiche avec un bouton "Rafraîchir"
 * pour récupérer les derniers messages.
 *
 * Le test crée une campagne de test : le MJ lit le sujet dans le navigateur,
 * un second utilisateur poste un message via l'API, et la snackbar doit
 * apparaître en direct.
 */

interface TestUser {
  token: string;
  userId: number;
  username: string;
}

async function registerAndLoginUser(
  request: APIRequestContext,
  username: string,
  password: string
): Promise<TestUser> {
  const registerRes = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password,
      website: '',
      elapsedMs: 10000,
    },
  });
  expect(registerRes.ok()).toBeTruthy();

  const loginRes = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(loginRes.ok()).toBeTruthy();
  const body = await loginRes.json();
  return { token: body.token, userId: body.user?.id ?? body.id, username };
}

test.describe('Snackbar nouveaux messages sur un sujet', () => {
  test('affiche une snackbar avec un bouton "Rafraîchir" quand un autre utilisateur poste', async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123!';
    const mj = await registerAndLoginUser(request, `e2e_ws_mj_${suffix}`, password);
    const player = await registerAndLoginUser(request, `e2e_ws_pl_${suffix}`, password);

    // Le MJ crée une campagne, une section et un sujet "grand public"
    // (isPrivate = 2 : n'importe qui peut y poster)
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne snackbar ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test snackbar',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { campaign } = await createResponse.json();

    const sectionRes = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { title: 'Section de test' },
    });
    expect(sectionRes.ok()).toBeTruthy();
    const { section } = await sectionRes.json();

    const topicRes = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        title: `Sujet snackbar ${suffix}`,
        isPrivate: 2,
        firstPostContent: `<p>Premier message ${suffix}</p>`,
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    // Le MJ ouvre le sujet dans le navigateur
    await page.addInitScript(
      (token: string) => localStorage.setItem('jdroll_token', token),
      mj.token
    );
    await page.goto(`/forum/${campaign.id}/${topic.id}`);
    await expect(page.getByText(`Premier message ${suffix}`).first()).toBeVisible();

    // Laisse le temps à la WebSocket de souscrire au sujet
    await page.waitForTimeout(500);

    // Un autre utilisateur poste un message via l'API
    const newPostContent = `Message surprise ${suffix}`;
    const postRes = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${player.token}` },
      data: { content: `<p>${newPostContent}</p>`, persoId: null },
    });
    expect(postRes.ok()).toBeTruthy();

    // La snackbar apparaît en direct avec le nombre de nouveaux messages
    const snackbar = page.locator('[data-testid="topic-new-posts-snackbar"]');
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText('1 nouveau message');

    const refreshButton = snackbar.getByRole('button', { name: /rafraîchir/i });
    await expect(refreshButton).toBeVisible();

    // Act : clic sur "Rafraîchir" -> le sujet est rechargé, la snackbar disparaît
    await refreshButton.click();
    await expect(snackbar).toBeHidden();
    await expect(page.getByText(newPostContent).first()).toBeVisible();
  });

  test("n'affiche pas de snackbar tant qu'aucun nouveau message n'est posté", async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123!';
    const mj = await registerAndLoginUser(request, `e2e_ws_mj_${suffix}`, password);

    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne snackbar silencieuse ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test snackbar',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { campaign } = await createResponse.json();

    const sectionRes = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { title: 'Section de test' },
    });
    expect(sectionRes.ok()).toBeTruthy();
    const { section } = await sectionRes.json();

    const topicRes = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        title: `Sujet silencieux ${suffix}`,
        isPrivate: 2,
        firstPostContent: `<p>Message initial ${suffix}</p>`,
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    await page.addInitScript(
      (token: string) => localStorage.setItem('jdroll_token', token),
      mj.token
    );
    await page.goto(`/forum/${campaign.id}/${topic.id}`);
    await expect(page.getByText(`Message initial ${suffix}`).first()).toBeVisible();

    // Aucun autre utilisateur ne poste : la snackbar reste masquée
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="topic-new-posts-snackbar"]')).toBeHidden();
  });
});
