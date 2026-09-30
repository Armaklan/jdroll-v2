import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Tests de la bannière par défaut :
 * une campagne sans bannière affiche l'image ban-empty au lieu d'une icône.
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(request: APIRequestContext, username: string): Promise<AuthResponse> {
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password: 'Password123',
      website: '',
      elapsedMs: 10000,
    },
  });
  if (!response.ok()) {
    throw new Error(`Échec de l'inscription de ${username} (${response.status()})`);
  }
  return response.json();
}

test.describe('Bannière par défaut', () => {
  test("une campagne sans bannière affiche l'image ban-empty sur sa page", async ({
    page,
    request,
  }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const { token } = await registerUser(request, `e2e_defban_${suffix}`);

    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Campagne test bannière défaut ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: "Campagne de test de la bannière par défaut",
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { campaign } = await createResponse.json();

    await page.goto('/');
    await page.evaluate((t) => {
      localStorage.setItem('jdroll_token', t);
    }, token);
    await page.goto(`/campaigns/${campaign.id}`);

    // Le header de campagne affiche l'image par défaut ban-empty, pas une icône
    const defaultBanner = page.locator('img[src*="ban-empty"]').first();
    await expect(defaultBanner).toBeVisible({ timeout: 10000 });
  });
});
