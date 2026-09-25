import { test, expect, Page } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';

/**
 * Authenticated Homepage Tests
 * The homepage shows a personalized dashboard for logged-in users:
 * no presentation blocks, campaign carousel, community stats,
 * chat preview and most recently active forum topics.
 */

interface TestUser {
  username: string;
  token: string;
}

async function registerTestUser(page: Page): Promise<TestUser> {
  const username = `e2e_home_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const response = await page.request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username}@test.local`,
      password: 'Passw0rd!123',
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return { username, token: body.token };
}

function makeTopic(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    sectionId: 1,
    title: 'Topic de test',
    stickable: false,
    isPrivate: 0,
    isClosed: false,
    ordre: 0,
    postsCount: 3,
    lastPost: {
      id: 10,
      createDate: '2026-09-25 10:00:00',
      userId: 1,
      username: 'TestMJ',
    },
    isRead: true,
    ...overrides,
  };
}

test.describe('Authenticated homepage', () => {
  let homePage: HomePage;
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    testUser = await registerTestUser(page);

    // Authenticate the SPA with the freshly registered user
    await page.addInitScript((token: string) => {
      localStorage.setItem('jdroll_token', token);
    }, testUser.token);

    await homePage.navigate();
    // Wait for the authenticated dashboard to render
    await expect(page.locator('[data-testid="home-dashboard"]')).toBeVisible({ timeout: 10000 });
  });

  test('Authenticated homepage shows the dashboard instead of the visitor content', async ({ page }) => {
    // Hero still visible with the welcome title
    await expect(homePage.heroTitle).toBeVisible();

    // Presentation blocks are hidden for authenticated users
    await expect(homePage.communitySection).toHaveCount(0);
    await expect(homePage.choiceSection).toHaveCount(0);
    await expect(homePage.platformSection).toHaveCount(0);

    // Visitor call-to-action is hidden
    await expect(page.getByText('Votre aventure commence ici')).toHaveCount(0);

    // The recruiting campaign carousel is still displayed
    await expect(homePage.carouselSection).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard displays community stats (online, latest registrations, birthdays)', async ({ page }) => {
    await expect(page.locator('[data-testid="home-stats"]')).toBeVisible();

    // Online users block is displayed
    await expect(page.locator('[data-testid="home-stats-online"]')).toBeVisible();

    // Latest registrations include the freshly registered user
    const registrations = page.locator('[data-testid="home-stats-registrations"]');
    await expect(registrations).toBeVisible();
    await expect(registrations.getByText(testUser.username)).toBeVisible();

    // Today's birthdays block is displayed (even when empty)
    await expect(page.locator('[data-testid="home-stats-birthdays"]')).toBeVisible();
  });

  test('Dashboard shows a 20 messages chat preview with a link to the chat', async ({ page }) => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      username: `Joueur${i}`,
      userAvatar: null,
      userProfil: 0,
      time: '2026-09-25 12:00:00',
      message: `Message de test numéro ${i + 1}`,
      to: '',
      to_username: '',
    }));

    await page.route('**/api/chat/messages?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages }),
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-testid="home-chat-preview"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="home-chat-preview-message"]')).toHaveCount(20);
    await expect(page.getByText('Message de test numéro 20')).toBeVisible();

    // Button navigates to the chat page
    await page.locator('[data-testid="home-chat-open-button"]').click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('Dashboard shows the 5 forum topics with the most recent activity', async ({ page }) => {
    const sections = [
      {
        id: 1,
        campagneId: null,
        title: 'Section A',
        ordre: 0,
        defaultCollapse: false,
        topics: [
          makeTopic({ id: 11, title: 'Topic le plus ancien', lastPost: { id: 1, createDate: '2026-09-01 08:00:00', userId: 1, username: 'TestMJ' } }),
          makeTopic({ id: 12, title: 'Topic le plus récent', lastPost: { id: 2, createDate: '2026-09-25 20:00:00', userId: 1, username: 'TestMJ' } }),
        ],
      },
      {
        id: 2,
        campagneId: null,
        title: 'Section B',
        ordre: 1,
        defaultCollapse: false,
        topics: [
          makeTopic({
            id: 13,
            title: 'Topic non lu',
            isRead: false,
            lastPost: { id: 3, createDate: '2026-09-24 18:00:00', userId: 1, username: 'TestMJ' },
          }),
          makeTopic({ id: 14, title: 'Topic lu récent', lastPost: { id: 4, createDate: '2026-09-23 12:00:00', userId: 1, username: 'TestMJ' } }),
          makeTopic({ id: 15, title: 'Autre topic actif', lastPost: { id: 5, createDate: '2026-09-22 09:30:00', userId: 1, username: 'TestMJ' } }),
          makeTopic({ id: 16, title: 'Topic sans activité', lastPost: null }),
        ],
      },
    ];

    await page.route('**/api/forum', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sections }),
      });
    });

    await page.goto('/');
    const topicsList = page.locator('[data-testid="home-recent-topics"]');
    await expect(topicsList).toBeVisible({ timeout: 10000 });

    // Exactly the 5 topics with a last post, ordered by most recent activity
    await expect(page.locator('[data-testid="home-recent-topic"]')).toHaveCount(5);
    const titles = await page.locator('[data-testid="home-recent-topic-title"]').allTextContents();
    expect(titles[0]).toBe('Topic le plus récent');
    expect(titles[1]).toBe('Topic non lu');
    expect(titles).not.toContain('Topic sans activité');

    // Read / unread indication
    const unreadBadges = page.locator('[data-testid="home-recent-topic-unread"]');
    await expect(unreadBadges).toHaveCount(1);
    await expect(page.locator('[data-testid="home-recent-topic"]').filter({ hasText: 'Topic non lu' }).locator('[data-testid="home-recent-topic-unread"]')).toBeVisible();

    // Clicking a topic opens it
    await page.locator('[data-testid="home-recent-topic"]').filter({ hasText: 'Topic le plus récent' }).click();
    await expect(page).toHaveURL(/\/topics\/12/);
  });

  test('Online users panel updates live when another user connects or disconnects', async ({ browser }) => {
    const setupUserPage = async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const user = await registerTestUser(page);
      await page.addInitScript((token: string) => {
        localStorage.setItem('jdroll_token', token);
      }, user.token);
      return { context, page, user };
    };

    const userA = await setupUserPage();
    await userA.page.goto('/');
    await expect(userA.page.locator('[data-testid="home-stats-online"]')).toBeVisible({ timeout: 10000 });

    // A second user connects from another browser context
    const userB = await setupUserPage();
    await userB.page.goto('/');
    await expect(userB.page.locator('[data-testid="home-stats-online"]')).toBeVisible({ timeout: 10000 });

    // Both see each other in the online panel without reloading
    await expect(userA.page.locator('[data-testid="home-stats-online"]')).toContainText(userB.user.username, { timeout: 10000 });
    await expect(userB.page.locator('[data-testid="home-stats-online"]')).toContainText(userA.user.username, { timeout: 10000 });

    // When user B closes their session, user A's panel updates live
    await userB.context.close();
    await expect(userA.page.locator('[data-testid="home-stats-online"]')).not.toContainText(userB.user.username, { timeout: 10000 });

    await userA.context.close();
  });
});
