import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * Ordre des catégories dans les résultats de la recherche flottante :
 * « Mes campagnes » doit être la dernière catégorie affichée,
 * après les sujets, cartes et personnages de la campagne courante.
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(
  request: APIRequestContext,
  username: string
): Promise<AuthResponse> {
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

async function setBrowserToken(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => window.localStorage.setItem('jdroll_token', t), token);
}

test('« Mes campagnes » est la dernière catégorie des résultats de la recherche flottante', async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const runId = Date.now();
  const { token } = await registerUser(request, `e2e_order_${runId}`);

  // Création de la campagne courante
  const createResponse = await request.post('/api/campaigns', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `E2E Ordre Resultats ${runId}`,
      systeme: 'D&D 5e',
      univers: 'Test',
      description: '<p>Campagne de test ordre des résultats</p>',
      nbJoueurs: 4,
      statut: 0,
      isRecrutementOpen: false,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const { campaign } = await createResponse.json();

  // Un personnage pour peupler la catégorie « Galerie des personnages »
  const charResponse = await request.post(`/api/campaigns/${campaign.id}/characters`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `E2E Perso Ordre ${runId}`,
      concept: 'Testeur ordre',
      avatar: '',
    },
  });
  expect(charResponse.ok()).toBeTruthy();

  await setBrowserToken(page, token);
  await page.goto(`/forum/${campaign.id}`);

  const searchButton = page.getByRole('button', { name: /Rechercher dans la campagne/ });
  await expect(searchButton).toBeVisible({ timeout: 10000 });
  await searchButton.click();

  // Au moins deux catégories visibles : personnages + Mes campagnes
  await expect(page.getByTestId('floating-search-category-characters')).toBeVisible();
  await expect(page.getByTestId('floating-search-category-campaigns')).toBeVisible();

  const order = await page
    .locator('[data-testid^="floating-search-category-"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid')));

  expect(order.length).toBeGreaterThanOrEqual(2);
  expect(order[order.length - 1]).toBe('floating-search-category-campaigns');
});
