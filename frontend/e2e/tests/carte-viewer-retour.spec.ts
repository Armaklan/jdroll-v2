import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests du bouton retour du viewer de carte ("Toutes les cartes")
 * - Navigation dans le même onglet : le bouton fait un retour arrière (précédent)
 * - Ouverture directe (nouvel onglet) : pas de précédent, retour au listing
 */

/**
 * Enregistre un utilisateur de test et renvoie son token
 */
async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_cvr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const response = await request.post('/api/auth/register', {
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
  return body.token as string;
}

/**
 * Trouve une campagne dont l'écran de listing des cartes contient au moins une carte
 */
async function findCampaignWithCarte(
  request: APIRequestContext,
  token: string
): Promise<{
  campaignId: number;
  carteId: number;
}> {
  const authHeaders = { Authorization: `Bearer ${token}` };
  const res = await request.get(`/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns) {
    const cartesRes = await request.get(`/api/campaigns/${campaign.id}/cartes`, {
      headers: authHeaders,
    });
    if (!cartesRes.ok()) continue;
    const cartes = (await cartesRes.json()) as Array<{ id: number }>;
    const carte = cartes.find((c) => Boolean(c.id));
    if (carte) {
      return { campaignId: campaign.id, carteId: carte.id };
    }
  }
  throw new Error('Aucune campagne avec une carte trouvée pour le test');
}

/**
 * Trouve un sujet de forum contenant un lien [carte=...] dans l'un de ses messages
 */
async function findTopicWithCarteLink(
  request: APIRequestContext,
  token: string
): Promise<{
  campaignId: number;
  topicId: number;
}> {
  const authHeaders = { Authorization: `Bearer ${token}` };
  const res = await request.get(`/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns) {
    const forumRes = await request.get(`/api/campaigns/${campaign.id}/forum`, {
      headers: authHeaders,
    });
    if (!forumRes.ok()) continue;
    const forum = (await forumRes.json()) as {
      sections: Array<{
        topics: Array<{ id: number }>;
      }>;
    };

    for (const section of forum.sections || []) {
      for (const topic of section.topics || []) {
        const topicRes = await request.get(`/api/topics/${topic.id}`, {
          headers: authHeaders,
        });
        if (!topicRes.ok()) continue;
        const topicDetail = (await topicRes.json()) as {
          posts: Array<{ content: string }>;
        };
        if (
          (topicDetail.posts || []).some((p) =>
            (p.content || '').includes('[carte='),
          )
        ) {
          return { campaignId: campaign.id, topicId: topic.id };
        }
      }
    }
  }
  throw new Error('Aucun sujet avec un lien [carte] trouvé pour le test');
}

test.describe('Bouton retour du viewer de carte', () => {
  test('Depuis un lien [carte] dans un sujet de forum, le bouton Retour revient au sujet', async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const token = await registerTestUser(request);
    const { campaignId, topicId } = await findTopicWithCarteLink(request, token);
    await request.dispose();

    // Les pages campagne et sujet exigent d'être connecté
    await page.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    // Ouvrir le sujet de forum contenant le lien [carte]
    await page.goto(`/forum/${campaignId}/${topicId}`);

    // Le lien [carte] est un vrai <a href>
    const carteLink = page.locator('a.carte-link').first();
    await expect(carteLink).toBeVisible();
    const href = await carteLink.getAttribute('href');
    expect(href).toBeTruthy();

    // Act: clic simple sur le lien (même onglet, navigation SPA)
    await carteLink.click();
    await expect(page).toHaveURL(href as string);

    // Le bouton du viewer est un bouton retour
    const backButton = page.getByRole('button', { name: 'Retour' });
    await expect(backButton).toBeVisible();

    // Act: clic retour
    await backButton.click();

    // Assert: on revient au sujet de forum précédent
    await expect(page).toHaveURL(
      new RegExp(`/forum/${campaignId}/${topicId}`),
    );
  });

  test('Depuis le listing (même onglet), le bouton fait un retour arrière vers la page précédente', async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const token = await registerTestUser(request);
    const { campaignId } = await findCampaignWithCarte(request, token);
    await request.dispose();

    // Les pages carte exigent d'être connecté
    await page.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    // Aller au listing, puis ouvrir la carte dans le même onglet
    await page.goto(`/campaigns/${campaignId}/cartes`);
    const carteLink = page
      .locator(`a[href^="/campaigns/${campaignId}/cartes/"]`)
      .first();
    await expect(carteLink).toBeVisible();
    await carteLink.click();
    await expect(page).toHaveURL(
      new RegExp(`/campaigns/${campaignId}/cartes/\\d+$`),
    );

    // Le bouton est un bouton retour (pas un simple lien vers le listing)
    const backButton = page.getByRole('button', { name: 'Retour' });
    await expect(backButton).toBeVisible();

    // Act: clic retour
    await backButton.click();

    // Assert: on revient à la page précédente (le listing)
    await expect(page).toHaveURL(`/campaigns/${campaignId}/cartes`);
  });

  test('Ouverture directe du viewer (nouvel onglet) : le bouton ramène au listing des cartes', async ({
    page,
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const token = await registerTestUser(request);
    const { campaignId, carteId } = await findCampaignWithCarte(request, token);
    await request.dispose();

    // Les pages carte exigent d'être connecté
    await page.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    // Ouverture directe, comme depuis un nouvel onglet (pas de précédent)
    await page.goto(`/campaigns/${campaignId}/cartes/${carteId}`);

    // Le bouton garde son libellé "Toutes les cartes"
    const backButton = page.getByRole('button', {
      name: 'Toutes les cartes',
    });
    await expect(backButton).toBeVisible();

    // Act: clic
    await backButton.click();

    // Assert: retour au listing des cartes de la campagne
    await expect(page).toHaveURL(`/campaigns/${campaignId}/cartes`);
  });
});
