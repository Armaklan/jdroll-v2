import { test, expect } from '@playwright/test';
import { RegisterPage } from '../page-objects/RegisterPage';

/**
 * Tests E2E - Antibot sur l'inscription
 * Deux mécanismes basiques côté serveur :
 * - Honeypot : champ caché "website" qui ne doit jamais être rempli
 * - Temps de remplissage minimal : "elapsedMs" doit être fourni et suffisant
 */
test.describe('Antibot - Inscription', () => {
  test('API: refuse une inscription avec le honeypot rempli', async ({ request }) => {
    const username = `ab_hp_${Date.now()}`;
    const res = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password: 'password123',
        website: 'http://spam.example.com',
        elapsedMs: 10000,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('API: refuse une inscription sans temps de remplissage (soumission directe)', async ({ request }) => {
    const username = `ab_nt_${Date.now()}`;
    const res = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password: 'password123',
      },
    });

    expect(res.status()).toBe(400);
  });

  test('API: refuse une inscription soumise trop vite', async ({ request }) => {
    const username = `ab_ft_${Date.now()}`;
    const res = await request.post('/api/auth/register', {
      data: {
        username,
        mail: `${username}@example.com`,
        password: 'password123',
        website: '',
        elapsedMs: 100,
      },
    });

    expect(res.status()).toBe(400);
  });

  test('UI: le champ honeypot est présent mais invisible', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.navigate();

    const honeypot = registerPage.honeypotInput;
    await expect(honeypot).toBeAttached();
    await expect(honeypot).toBeHidden();
  });

  test('UI: une inscription via le formulaire reste acceptée', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.navigate();

    const username = `ab_ok_${Date.now()}`;
    await registerPage.fillRegisterForm(username, `${username}@example.com`, 'password123');

    // Soumission après le temps minimal de remplissage attendu par l'antibot
    await page.waitForTimeout(2000);

    const responsePromise = page.waitForResponse((res) => res.url().includes('/api/auth/register'));
    await registerPage.registerButton.click();
    const response = await responsePromise;

    expect(response.status()).toBe(201);
    await expect(page).not.toHaveURL(/register/);
  });
});
