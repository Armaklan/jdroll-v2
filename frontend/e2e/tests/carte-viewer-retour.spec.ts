import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests du bouton retour du viewer de carte ("Toutes les cartes")
 * - Navigation dans le même onglet : le bouton fait un retour arrière (précédent)
 * - Ouverture directe (nouvel onglet) : pas de précédent, retour au listing
 */

/**
 * Trouve une campagne dont l'écran de listing des cartes contient au moins une carte
 */
async function findCampaignWithCarte(request: APIRequestContext): Promise<{
  campaignId: number;
  carteId: number;
}> {
  const res = await request.get(`/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns) {
    const cartesRes = await request.get(
      `/api/campaigns/${campaign.id}/cartes`,
    );
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
async function findTopicWithCarteLink(request: APIRequestContext): Promise<{
  campaignId: number;
  topicId: number;
}> {
  const res = await request.get(`/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns) {
    const forumRes = await request.get(`/api/campaigns/${campaign.id}/forum`);
    if (!forumRes.ok()) continue;
    const forum = (await forumRes.json()) as {
      sections: Array<{
        topics: Array<{ id: number }>;
      }>;
    };

    for (const section of forum.sections || []) {
      for (const topic of section.topics || []) {
        const topicRes = await request.get(`/api/topics/${topic.id}`);
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
    const { campaignId, topicId } = await findTopicWithCarteLink(request);
    await request.dispose();

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
    const { campaignId } = await findCampaignWithCarte(request);
    await request.dispose();

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
    const { campaignId, carteId } = await findCampaignWithCarte(request);
    await request.dispose();

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
