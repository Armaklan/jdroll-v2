import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests d'ouverture des sujets du forum dans un nouvel onglet
 * (ctrl+clic / clic droit -> nouvel onglet, permis par de vraies balises <a href>)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Trouve une campagne dont le forum contient au moins un sujet
 */
async function findCampaignWithTopic(request: APIRequestContext): Promise<{
  campaignId: number;
  topicId: number;
}> {
  const res = await request.get(`${BASE_URL}/api/campaigns`);
  expect(res.ok()).toBeTruthy();
  const { campaigns } = (await res.json()) as {
    campaigns: Array<{ id: number }>;
  };

  for (const campaign of campaigns.slice(0, 20)) {
    const forumRes = await request.get(
      `${BASE_URL}/api/campaigns/${campaign.id}/forum`,
    );
    if (!forumRes.ok()) continue;
    const forum = (await forumRes.json()) as {
      sections: Array<{ topics: Array<{ id: number }> }>;
    };
    const topic = forum.sections
      .flatMap((section) => section.topics)
      .find((t) => Boolean(t.id));
    if (topic) {
      return { campaignId: campaign.id, topicId: topic.id };
    }
  }
  throw new Error('Aucune campagne avec un sujet trouvée pour le test');
}

test.describe('Ouvrir un sujet dans un nouvel onglet', () => {
  test('Forum général : ctrl+clic sur un sujet ouvre un nouvel onglet', async ({
    page,
    context,
  }) => {
    await page.goto('/forum/0');

    // Le titre du sujet doit être un vrai lien avec un href
    const topicLink = page.locator('a[href^="/forum/0/"]').first();
    await expect(topicLink).toBeVisible();

    // Act: ctrl+clic sur le lien
    const newPagePromise = context.waitForEvent('page');
    await topicLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre sur le sujet
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(/\/forum\/0\/\d+$/);
  });

  test('Forum de campagne : ctrl+clic sur un sujet ouvre un nouvel onglet', async ({
    page,
    context,
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { campaignId } = await findCampaignWithTopic(request);
    await request.dispose();

    await page.goto(`/forum/${campaignId}`);

    const topicLink = page
      .locator(`a[href^="/forum/${campaignId}/"]`)
      .first();
    await expect(topicLink).toBeVisible();

    // Act: ctrl+clic sur le lien
    const newPagePromise = context.waitForEvent('page');
    await topicLink.click({ modifiers: ['Control'] });

    // Assert: un nouvel onglet s'ouvre sur le sujet
    const newPage = await newPagePromise;
    await expect(newPage).toHaveURL(new RegExp(`/forum/${campaignId}/\\d+$`));
  });
});
