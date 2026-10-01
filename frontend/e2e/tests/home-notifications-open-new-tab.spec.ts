import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests d'ouverture dans un nouvel onglet depuis la page d'accueil et
 * les notifications
 * (ctrl+clic / clic droit -> nouvel onglet, permis par de vraies balises <a href>)
 */

/**
 * Enregistre un utilisateur de test et renvoie son token
 */
async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_ontab_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

test.describe('Ouvrir dans un nouvel onglet depuis la page d accueil et les notifications', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('Accueil : ctrl+clic sur « Ouvrir le tchat » ouvre le tchat dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/');

    // Le bouton doit être un vrai lien avec un href
    const chatLink = page.locator('a[data-testid="home-chat-open-button"]');
    await expect(chatLink).toBeVisible();
    await expect(chatLink).toHaveAttribute('href', '/chat');

    // Act: ctrl+clic
    const newPagePromise = context.waitForEvent('page');
    await chatLink.click({ modifiers: ['Control'] });

    // Assert: nouvel onglet sur le tchat, onglet d'origine sur l'accueil
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(/\/chat$/);
    await expect(page).toHaveURL(/\/$/);
  });

  test('Accueil : ctrl+clic sur « Voir le forum » ouvre le forum général dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    await page.goto('/');

    const forumLink = page.locator(
      'section[data-testid="home-recent-topics"] a[href="/forum/0"]'
    );
    await expect(forumLink).toBeVisible();

    // Act: ctrl+clic
    const newPagePromise = context.waitForEvent('page');
    await forumLink.click({ modifiers: ['Control'] });

    // Assert: nouvel onglet sur le forum général
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(/\/forum\/0$/);
  });

  test('Accueil : ctrl+clic sur un sujet récent ouvre le sujet dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const token = await registerTestUser(request);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, token);

    // Récupère un sujet récent réel affiché sur la page d'accueil
    const recentRes = await request.get('/api/forum/recent-topics?limit=5');
    expect(recentRes.ok()).toBeTruthy();
    const { topics } = (await recentRes.json()) as {
      topics: Array<{ id: number }>;
    };
    expect(topics.length).toBeGreaterThan(0);
    const topicId = topics[0].id;

    await page.goto('/');

    // Le sujet récent doit être un vrai lien avec un href
    const topicLink = page.locator(
      `section[data-testid="home-recent-topics"] a[href="/topics/${topicId}"]`
    );
    await expect(topicLink).toBeVisible();

    // Act: ctrl+clic
    const newPagePromise = context.waitForEvent('page');
    await topicLink.click({ modifiers: ['Control'] });

    // Assert: nouvel onglet sur le sujet
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(new RegExp(`/topics/${topicId}$`));
  });

  test('Notifications : ctrl+clic sur une notification ouvre sa cible dans un nouvel onglet', async ({
    page,
    context,
    request,
  }) => {
    const mjToken = await registerTestUser(request);
    const playerToken = await registerTestUser(request);

    // Le MJ crée une campagne, une section et un sujet
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mjToken}` },
      data: {
        name: `Campagne notif onglet ${Date.now()}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test notification nouvel onglet',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { campaign } = await createResponse.json();

    const sectionRes = await request.post(`/api/campaigns/${campaign.id}/sections`, {
      headers: { Authorization: `Bearer ${mjToken}` },
      data: { title: 'Section de test' },
    });
    expect(sectionRes.ok()).toBeTruthy();
    const { section } = await sectionRes.json();

    const topicRes = await request.post(`/api/sections/${section.id}/topics`, {
      headers: { Authorization: `Bearer ${mjToken}` },
      data: {
        title: `Sujet notif onglet ${Date.now()}`,
        isPrivate: 2,
        firstPostContent: '<p>Premier message</p>',
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    // Un joueur poste : le MJ reçoit une notification pointant sur le sujet
    const postRes = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${playerToken}` },
      data: { content: '<p>Message du joueur</p>', persoId: null },
    });
    expect(postRes.ok()).toBeTruthy();

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, mjToken);

    await page.goto('/');

    // Ouvre le popover des notifications
    await page.locator('button[aria-label="Notifications"]').first().click();

    // La notification doit être un vrai lien avec un href vers le sujet
    const notifLink = page
      .locator(`a[href^="/forum/${campaign.id}/${topic.id}"]`)
      .first();
    await expect(notifLink).toBeVisible();

    // Act: ctrl+clic
    const newPagePromise = context.waitForEvent('page');
    await notifLink.click({ modifiers: ['Control'] });

    // Assert: nouvel onglet sur le sujet du forum
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(
      new RegExp(`/forum/${campaign.id}/${topic.id}/page/1`)
    );
  });
});
