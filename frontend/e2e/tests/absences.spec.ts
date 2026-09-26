import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Absences Tests
 * 1. Un utilisateur peut déclarer une absence depuis son profil (onglet Absences)
 * 2. Le MJ est informé des joueurs de sa partie actuellement absents,
 *    affiché avant la section "Messages non lus" de la page de campagne
 */

interface AuthResponse {
  token: string;
  user: { id: number; username: string };
}

async function registerUser(request: APIRequestContext, username: string, password: string): Promise<AuthResponse> {
  const response = await request.post('/api/auth/register', {
    data: {
      username,
      mail: `${username.toLowerCase()}@example.com`,
      password,
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Échec de l'inscription de ${username} (${response.status()}): ${body}`);
  }
  return response.json();
}

async function setBrowserToken(page: import('@playwright/test').Page, token: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('jdroll_token', t);
  }, token);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test.describe('Absences', () => {
  test("un utilisateur peut déclarer une absence depuis son profil", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const username = `e2e_absence_${suffix}`;
    const { token } = await registerUser(request, username, 'Password123');

    await setBrowserToken(page, token);
    await page.goto('/settings');

    // Ouvrir l'onglet Absences du profil
    await page.getByRole('button', { name: /Absences/i }).click();

    // Remplir le formulaire de déclaration
    await page.locator('#absence-begin-date').fill('2026-09-26');
    await page.locator('#absence-end-date').fill('2026-09-28');
    await page.locator('#absence-commentaire').fill('Vacances en famille');
    await page.getByRole('button', { name: /Déclarer l'absence/i }).click();

    // L'absence apparaît dans la liste "Mes absences"
    const list = page.getByTestId('absences-list');
    await expect(list).toContainText('Vacances en famille');
    await expect(list).toContainText('Du 26/09/2026 au 28/09/2026');

    // Suppression de l'absence déclarée
    await page.getByRole('button', { name: /Supprimer/i }).first().click();
    await expect(page.getByText(/Vous n'avez déclaré aucune absence/i)).toBeVisible();
  });

  test("le MJ est informé des joueurs actuellement absents avant les messages non lus", async ({ page, request }) => {
    const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const password = 'Password123';
    const mj = await registerUser(request, `e2e_abs_mj_${suffix}`, password);
    const player = await registerUser(request, `e2e_abs_pl_${suffix}`, password);

    // Création de la campagne par le MJ
    const createResponse = await request.post('/api/campaigns', {
      headers: { Authorization: `Bearer ${mj.token}` },
      data: {
        name: `Campagne absences ${suffix}`,
        systeme: 'D&D 5e',
        univers: 'Test',
        description: 'Campagne de test des absences',
        nbJoueurs: 4,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { campaign } = await createResponse.json();

    // Le joueur rejoint la campagne, puis le MJ valide son inscription
    const joinResponse = await request.post(`/api/campaigns/${campaign.id}/join`, {
      headers: { Authorization: `Bearer ${player.token}` },
    });
    expect(joinResponse.ok()).toBeTruthy();

    const acceptResponse = await request.post(`/api/campaigns/${campaign.id}/participants/${player.user.id}/accept`, {
      headers: { Authorization: `Bearer ${mj.token}` },
    });
    expect(acceptResponse.ok()).toBeTruthy();

    // Le joueur déclare une absence en cours
    const today = new Date();
    const inTwoDays = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const absenceResponse = await request.post('/api/absences', {
      headers: { Authorization: `Bearer ${player.token}` },
      data: {
        beginDate: toDateString(today),
        endDate: toDateString(inTwoDays),
        commentaire: 'Vacances en famille',
      },
    });
    expect(absenceResponse.ok()).toBeTruthy();

    // Le MJ ouvre la page de sa campagne
    await setBrowserToken(page, mj.token);
    await page.goto(`/campaigns/${campaign.id}`);

    // Le bandeau d'absences est visible avec le nom du joueur et le commentaire
    const banner = page.getByTestId('campaign-absences-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Joueurs actuellement absents');
    await expect(banner).toContainText(player.user.username);
    await expect(banner).toContainText('Vacances en famille');

    // Le bandeau est affiché avant la section "Messages non lus" si elle est présente
    const isBannerBeforeUnread = await page.evaluate(() => {
      const bannerEl = document.querySelector('[data-testid="campaign-absences-banner"]');
      const unreadHeader = Array.from(document.querySelectorAll('h3, span, div')).find(
        (el) => el.textContent?.trim() === 'Messages non lus'
      );
      if (!bannerEl || !unreadHeader) {
        return true;
      }
      return bannerEl.compareDocumentPosition(unreadHeader) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(isBannerBeforeUnread).toBe(true);
  });
});
