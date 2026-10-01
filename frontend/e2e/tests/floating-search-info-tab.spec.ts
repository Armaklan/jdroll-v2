import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * Onglets de la recherche flottante de campagne :
 * - « Recherche » est l'onglet actif par défaut (champ de recherche visible) ;
 * - « Information rapide » affiche le contenu formaté (HTML) du champ
 *   sidebar_text de campagne_config, configurable par le MJ via
 *   PATCH /api/campaigns/:id.
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

async function createCampaign(
  request: APIRequestContext,
  token: string,
  name: string
): Promise<number> {
  const response = await request.post('/api/campaigns', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      systeme: 'D&D 5e',
      univers: 'Test',
      description: '<p>Campagne de test e2e information rapide</p>',
      nbJoueurs: 4,
      statut: 0,
      isRecrutementOpen: false,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.campaign.id as number;
}

async function setBrowserToken(page: Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => window.localStorage.setItem('jdroll_token', t), token);
}

test.describe('Recherche flottante - onglets Recherche / Information rapide', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

  test('l\'onglet Recherche est actif par défaut, Information rapide affiche le sidebar_text du MJ', async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    const { token } = await registerUser(request, `e2e_info_tab_${runId}`);
    const campaignId = await createCampaign(request, token, `E2E Info Rapide ${runId}`);

    // Le MJ configure le texte de la barre latérale
    const patchResponse = await request.patch(`/api/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        sidebarText: `<p><strong>E2E-INFO-${runId}</strong> : rappel des règles de la table</p>`,
      },
    });
    expect(patchResponse.ok()).toBeTruthy();
    const patched = await patchResponse.json();
    expect(patched.campaign.sidebarText).toContain(`E2E-INFO-${runId}`);

    await setBrowserToken(page, token);
    await page.goto(`/forum/${campaignId}`);

    // Ouverture de la recherche flottante
    const searchButton = page.getByRole('button', { name: /Rechercher dans la campagne/ });
    await expect(searchButton).toBeVisible({ timeout: 10000 });
    await searchButton.click();

    const modal = page.getByText(/Accès rapide/).first();
    await expect(modal).toBeVisible();

    // Onglet par défaut : Recherche (champ de recherche visible)
    const searchInput = page.getByPlaceholder(
      /Rechercher par nom \(campagne, topic, carte, personnage\)/
    );
    await expect(searchInput).toBeVisible();

    // Passage sur l'onglet Information rapide
    await page.getByTestId('floating-search-info-tab').click();

    const infoContent = page.getByTestId('floating-search-info-content');
    await expect(infoContent).toBeVisible();
    await expect(infoContent).toContainText(`E2E-INFO-${runId}`);
    // Le contenu est rendu au format HTML attendu (balise strong conservée)
    await expect(infoContent.locator('strong', { hasText: `E2E-INFO-${runId}` })).toBeVisible();

    // Retour sur l'onglet Recherche
    await page.getByRole('button', { name: /^Recherche$/ }).click();
    await expect(searchInput).toBeVisible();
  });

  test('l\'onglet Information rapide affiche un message vide si le MJ n\'a rien configuré', async ({
    page,
    request,
  }) => {
    const runId = Date.now();
    const { token } = await registerUser(request, `e2e_info_empty_${runId}`);
    const campaignId = await createCampaign(request, token, `E2E Info Vide ${runId}`);

    await setBrowserToken(page, token);
    await page.goto(`/forum/${campaignId}`);

    const searchButton = page.getByRole('button', { name: /Rechercher dans la campagne/ });
    await expect(searchButton).toBeVisible({ timeout: 10000 });
    await searchButton.click();

    await page.getByTestId('floating-search-info-tab').click();

    await expect(page.getByText('Aucune information rapide')).toBeVisible();
  });
});
