import { test, expect, APIRequestContext, Page } from '@playwright/test';

/**
 * Sujet fermé (verrouillé) :
 * 1. Un joueur ne peut pas répondre (API + UI)
 * 2. Le MJ de la campagne peut toujours répondre (API + UI)
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(request: APIRequestContext, username: string, password: string): Promise<AuthResponse> {
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password,
      website: '',
      elapsedMs: 10000,
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Échec de l'inscription de ${username} (${response.status()}): ${body}`);
  }
  return response.json();
}

async function setBrowserToken(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('jdroll_token', t);
  }, token);
}

test.describe('Sujet fermé (verrouillé)', () => {
  test("le MJ peut répondre à un sujet fermé, le joueur est bloqué", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const mj = await registerUser(request, `e2e_closed_mj_${suffix}`, password);
    const player = await registerUser(request, `e2e_closed_pl_${suffix}`, password);

    // Création de la campagne par le MJ
    const createCampaignResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne sujet fermé ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test sujet fermé',
        nbJoueurs: 4,
      },
    });
    expect(createCampaignResponse.ok()).toBeTruthy();
    const { campaign } = await createCampaignResponse.json();

    // Le joueur rejoint la campagne, puis le MJ valide son inscription
    const joinResponse = await request.post(`/api/campaigns/${campaign.id}/join`, {
      headers: { Authorization: `Bearer ${player.token}` },
    });
    expect(joinResponse.ok()).toBeTruthy();

    const acceptResponse = await request.post(
      `/api/campaigns/${campaign.id}/participants/${player.user.id}/accept`,
      { headers: { Authorization: `Bearer ${mj.token}` } }
    );
    expect(acceptResponse.ok()).toBeTruthy();

    // Le MJ crée une section puis un sujet fermé
    const createSectionResponse = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { title: `Section test ${suffix}` },
    });
    expect(createSectionResponse.ok()).toBeTruthy();
    const { section } = await createSectionResponse.json();

    const createTopicResponse = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        title: `Sujet fermé ${suffix}`,
        isClosed: true,
        firstPostContent: '<p>Le MJ verrouille ce fil.</p>',
      },
    });
    expect(createTopicResponse.ok()).toBeTruthy();
    const { topic } = await createTopicResponse.json();
    expect(topic.isClosed).toBe(true);

    // API : le joueur ne peut pas répondre au sujet fermé
    const playerPostResponse = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${player.token}` },
      data: { content: '<p>Tentative du joueur</p>' },
    });
    expect(playerPostResponse.status()).toBe(400);

    // API : le MJ peut répondre au sujet fermé
    const mjPostResponse = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { content: '<p>Le MJ a toujours le dernier mot.</p>' },
    });
    expect(mjPostResponse.status()).toBe(201);
    const { post: mjPost } = await mjPostResponse.json();
    expect(mjPost.topicId).toBe(topic.id);

    // UI : le joueur voit le bandeau "Ce sujet est fermé" et pas de formulaire
    await setBrowserToken(page, player.token);
    await page.goto(`/topics/${topic.id}`);
    await expect(page.getByText('Ce sujet est fermé')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Publier le message/i })).toHaveCount(0);

    // UI : le MJ voit le formulaire de réponse malgré le sujet fermé
    await setBrowserToken(page, mj.token);
    await page.goto(`/topics/${topic.id}`);
    await expect(page.getByRole('button', { name: /Publier le message/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Le MJ a toujours le dernier mot.')).toBeVisible();

    // Le badge "Fermé" reste visible pour le MJ
    await expect(page.getByText('Fermé', { exact: true })).toBeVisible();
  });
});
