import { test, expect, APIRequestContext, Page } from '@playwright/test';

/**
 * Tests du badge de favicon : le nombre de notifications non lues
 * est affiché en badge sur la favicon de l'onglet, puis retiré
 * quand toutes les notifications sont supprimées.
 */

async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_favicon_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

async function getFaviconHref(page: Page): Promise<string> {
  return page.evaluate(() => document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? '');
}

test.describe('Badge de favicon', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('Affiche le nombre de notifications en badge sur la favicon puis le retire', async ({
    page,
    context,
    request,
  }) => {
    const mjToken = await registerTestUser(request);
    const playerToken = await registerTestUser(request);

    // Le MJ crée une campagne, une section et un sujet privé
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mjToken}` },
      data: {
        name: `Campagne favicon ${Date.now()}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test badge favicon',
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
        title: `Sujet favicon ${Date.now()}`,
        isPrivate: 2,
        firstPostContent: '<p>Premier message</p>',
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
    }, mjToken);

    await page.goto('/');

    // La favicon est celle du site, sans badge
    expect(await getFaviconHref(page)).toBe('/jdroll-logo.svg');

    // Un joueur poste : le MJ reçoit une notification
    const postRes = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${playerToken}` },
      data: { content: '<p>Message du joueur pour badge favicon</p>', persoId: null },
    });
    expect(postRes.ok()).toBeTruthy();

    // La favicon porte maintenant un badge avec le compteur
    await expect
      .poll(async () => {
        const href = await getFaviconHref(page);
        if (!href.startsWith('data:image/svg+xml,')) {
          return '';
        }
        return decodeURIComponent(href.replace('data:image/svg+xml,', ''));
      })
      .toContain('1</text>');

    // Toutes les notifications sont supprimées via le popover
    await page.locator('button[aria-label="Notifications"]').first().click();
    await page.getByRole('button', { name: 'Tout effacer' }).first().click();

    // La favicon est restaurée
    await expect
      .poll(async () => getFaviconHref(page))
      .toBe('/jdroll-logo.svg');
  });
});
