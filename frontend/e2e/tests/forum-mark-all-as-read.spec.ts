import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Bouton « Tout marquer comme lu » du forum de campagne
 *
 * Le bouton est proposé à tout utilisateur connecté dès qu'il y a des sujets
 * non lus, même s'il n'est pas inscrit à la campagne (ni MJ, ni joueur,
 * ni observateur). Un visiteur non membre doit donc pouvoir l'utiliser
 * pour nettoyer ses indicateurs de lecture.
 */

interface TestUser {
  token: string;
  userId: number;
}

async function registerUser(
  request: APIRequestContext,
  username: string
): Promise<TestUser> {
  const registerRes = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password: 'Password123!',
      website: '',
      elapsedMs: 10000,
    },
  });
  expect(registerRes.ok()).toBeTruthy();
  const body = await registerRes.json();
  return {
    token: body.token as string,
    userId: (body.user?.id ?? body.id) as number,
  };
}

test.describe('Bouton « Tout marquer comme lu » du forum de campagne', () => {
  test("est visible et fonctionnel pour un utilisateur non inscrit à la campagne", async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const mj = await registerUser(request, `e2e_mar_mj_${suffix}`);
    const visitor = await registerUser(request, `e2e_mar_vis_${suffix}`);

    // Création de la campagne, d'une section et d'un sujet public par le MJ
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne marquer-comme-lu ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test marquer comme lu',
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
        title: `Sujet marquer-comme-lu ${suffix}`,
        isPrivate: 0,
        firstPostContent: `<p>Premier message ${suffix}</p>`,
      },
    });
    expect(topicRes.ok()).toBeTruthy();

    // Le visiteur (non membre de la campagne) ouvre le forum
    await page.addInitScript((token: string) => {
      localStorage.setItem('jdroll_token', token);
    }, visitor.token);
    await page.goto(`/forum/${campaign.id}`);

    // Le bouton doit être visible pour ce non-membre tant qu'il y a des non-lus
    const markAllButton = page.getByRole('button', { name: 'Tout marquer comme lu' });
    await expect(markAllButton).toBeVisible();

    // Le clic marque tous les sujets comme lus : le bouton disparaît
    await markAllButton.click();
    await expect(markAllButton).toBeHidden();
  });
});
