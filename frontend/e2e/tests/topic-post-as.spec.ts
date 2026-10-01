import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Sélecteur « Poster en tant que » sur un sujet de forum
 *
 * Le sélecteur est un combobox : il regroupe les personnages en PNJ (sans
 * utilisateur propriétaire) affichés en premier, puis les PJ (personnages
 * joueurs), et permet de rechercher dans la liste (nom ou concept).
 *
 * Le test crée une campagne avec un PNJ et un PJ, ouvre le sujet en tant que
 * MJ (qui peut poster avec n'importe quel personnage de la campagne) et
 * vérifie le regroupement, la recherche et la publication effective.
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
  return { token: body.token as string, userId: (body.user?.id ?? body.id) as number };
}

test.describe('Sélecteur « Poster en tant que »', () => {
  test('regroupe PNJ puis PJ et permet la recherche puis la publication', async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const mj = await registerUser(request, `e2e_pa_mj_${suffix}`);
    const player = await registerUser(request, `e2e_pa_pl_${suffix}`);

    // Création de la campagne, d'une section et d'un sujet par le MJ
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne poster-en-tant-que ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test poster en tant que',
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
        title: `Sujet poster-en-tant-que ${suffix}`,
        isPrivate: 2,
        firstPostContent: `<p>Premier message ${suffix}</p>`,
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    // Un PNJ (sans propriétaire) et un PJ (appartenant au joueur)
    const pnjName = `Baal Zebub ${suffix}`;
    const pjName = `Fiora Aiglebrume ${suffix}`;
    const pnjRes = await request.post(`/api/campaigns/${campaign.id}/characters`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { name: pnjName, concept: 'Démon ancien', assignedUserId: null },
    });
    expect(pnjRes.ok()).toBeTruthy();

    const pjRes = await request.post(`/api/campaigns/${campaign.id}/characters`, {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: { name: pjName, concept: 'Chevalière', assignedUserId: player.userId },
    });
    expect(pjRes.ok()).toBeTruthy();

    // Le MJ ouvre le sujet
    await page.addInitScript(
      (token: string) => localStorage.setItem('jdroll_token', token),
      mj.token
    );
    await page.goto(`/forum/${campaign.id}/${topic.id}`);
    await expect(page.getByText(`Premier message ${suffix}`).first()).toBeVisible();

    // Ouverture du combobox « Poster en tant que »
    const selectButton = page.locator('[data-testid="post-author-select"]');
    await expect(selectButton).toBeVisible();
    await selectButton.click();

    // Les deux groupes sont affichés : PNJ d'abord, puis PJ
    const pnjHeader = page.locator('[data-testid="post-author-group-pnj"]');
    const pjHeader = page.locator('[data-testid="post-author-group-pj"]');
    await expect(pnjHeader).toHaveText('PNJ');
    await expect(pjHeader).toHaveText('PJ');
    const pnjHeaderBox = await pnjHeader.boundingBox();
    const pjHeaderBox = await pjHeader.boundingBox();
    expect(pnjHeaderBox?.y).toBeDefined();
    expect(pjHeaderBox?.y).toBeGreaterThan(pnjHeaderBox!.y);

    // Les deux personnages sont proposés, le PNJ au-dessus du PJ
    const pnjOption = page.locator('[data-testid="post-author-option"]', {
      hasText: pnjName,
    });
    const pjOption = page.locator('[data-testid="post-author-option"]', {
      hasText: pjName,
    });
    await expect(pnjOption).toBeVisible();
    await expect(pjOption).toBeVisible();
    expect((await pjOption.boundingBox())!.y).toBeGreaterThan(
      (await pnjOption.boundingBox())!.y
    );

    // Recherche dans la liste : la requête filtre les personnages
    const searchInput = page.locator('[data-testid="post-author-search"]');
    await expect(searchInput).toBeFocused();
    await searchInput.fill('fior');
    await expect(pjOption).toBeVisible();
    await expect(pnjOption).toBeHidden();

    // Effacement de la recherche, puis sélection du PJ
    await searchInput.fill('');
    await expect(pnjOption).toBeVisible();
    await pjOption.click();

    // Le bouton affiche le personnage sélectionné
    await expect(selectButton).toContainText(pjName);

    // Publication effective en tant que ce personnage
    const editor = page.locator('div[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.insertText(`Message de test en tant que ${suffix}`);
    await page.getByRole('button', { name: /publier le message/i }).click();
    await expect(
      page.getByText(`Message de test en tant que ${suffix}`).first()
    ).toBeVisible();

    // Le message publié porte le nom du personnage sélectionné (en-tête du post)
    await expect(page.locator('h4', { hasText: pjName }).first()).toBeVisible();
  });
});
