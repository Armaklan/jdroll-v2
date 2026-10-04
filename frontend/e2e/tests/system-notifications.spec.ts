import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests des notifications système (Web Notifications API) :
 * activation via le popover des notifications, puis réception d'une
 * notification OS quand une notification du site arrive via WebSocket.
 */

const BASE_ORIGIN = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Espionne les notifications système créées via `new Notification(...)`.
 * Indispensable car l'événement page 'notification' de Playwright ne se
 * déclenche pas en Chromium headless.
 */
async function spySystemNotifications(context: import('@playwright/test').BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const RealNotification = window.Notification;
    const created: Array<{ title: string; body: string | null; tag: string | null }> = [];
    function SpyNotification(this: unknown, title: string, options?: NotificationOptions) {
      const notification = new RealNotification(title, options);
      created.push({ title, body: options?.body ?? null, tag: options?.tag ?? null });
      return notification;
    }
    SpyNotification.permission = RealNotification.permission;
    SpyNotification.requestPermission = () => RealNotification.requestPermission();
    Object.defineProperty(SpyNotification, 'name', { value: 'Notification' });
    window.Notification = SpyNotification as unknown as typeof Notification;
    (window as unknown as { __systemNotifications: typeof created }).__systemNotifications = created;
  });
}

async function getSpiedSystemNotifications(
  page: import('@playwright/test').Page
): Promise<Array<{ title: string; body: string | null; tag: string | null }>> {
  return page.evaluate(
    () => (window as unknown as { __systemNotifications?: Array<{ title: string; body: string | null; tag: string | null }> }).__systemNotifications ?? []
  );
}

async function registerTestUser(request: APIRequestContext): Promise<string> {
  const username = `e2e_sysnotif_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
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

test.describe('Notifications système', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('Activer les notifications système puis recevoir une notification OS à la réception d une notification du site', async ({
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
        name: `Campagne notif système ${Date.now()}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test notification système',
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
        title: `Sujet notif système ${Date.now()}`,
        isPrivate: 2,
        firstPostContent: '<p>Premier message</p>',
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    // La permission notifications est accordée au contexte navigateur
    await context.grantPermissions(['notifications'], { origin: BASE_ORIGIN });
    await spySystemNotifications(context);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
      localStorage.removeItem('jdroll-system-notifications');
    }, mjToken);

    await page.goto('/');

    // Ouvre le popover des notifications
    await page.locator('button[aria-label="Notifications"]').first().click();

    // Le bouton d'activation des notifications système est présent et désactivé
    const toggle = page.locator('button[data-testid="system-notifications-toggle"]').first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Act: activer les notifications système
    await toggle.click();

    // Assert: le bouton reflète l'état activé
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Un joueur poste : le MJ reçoit une notification OS pointant sur le sujet
    const postRes = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${playerToken}` },
      data: { content: '<p>Message du joueur pour notification système</p>', persoId: null },
    });
    expect(postRes.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const created = await getSpiedSystemNotifications(page);
        return created.some(
          (n) => n.title.includes('Nouveau post') && (n.body ?? '').includes('Sujet notif système')
        );
      })
      .toBe(true);
  });

  test('Désactiver les notifications système n affiche plus de notification OS', async ({
    page,
    context,
    request,
  }) => {
    const mjToken = await registerTestUser(request);
    const playerToken = await registerTestUser(request);

    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mjToken}` },
      data: {
        name: `Campagne notif off ${Date.now()}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test notification système désactivée',
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
        title: `Sujet notif off ${Date.now()}`,
        isPrivate: 2,
        firstPostContent: '<p>Premier message</p>',
      },
    });
    expect(topicRes.ok()).toBeTruthy();
    const { topic } = await topicRes.json();

    await context.grantPermissions(['notifications'], { origin: BASE_ORIGIN });
    await spySystemNotifications(context);

    await context.addInitScript((t: string) => {
      localStorage.setItem('jdroll_token', t);
      localStorage.removeItem('jdroll-system-notifications');
    }, mjToken);

    await page.goto('/');
    await page.locator('button[aria-label="Notifications"]').first().click();

    // Activer puis désactiver les notifications système
    const toggle = page.locator('button[data-testid="system-notifications-toggle"]').first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Un joueur poste : aucune notification OS ne doit être affichée
    const postRes = await request.post(`/api/topics/${topic.id}/posts`, {
      headers: { Authorization: `Bearer ${playerToken}` },
      data: { content: '<p>Message du joueur notification système off</p>', persoId: null },
    });
    expect(postRes.ok()).toBeTruthy();

    // Laisse le temps au WebSocket de livrer la notification du site
    await page.waitForTimeout(3000);
    expect(await getSpiedSystemNotifications(page)).toEqual([]);
  });
});
