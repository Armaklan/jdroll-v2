import { test, expect } from '@playwright/test';
import { RegisterPage } from '../page-objects/RegisterPage';
import { SettingsPage } from '../page-objects/SettingsPage';

/**
 * Tests de l'éditeur Wysiwyg - Gestion des images
 * - Coller une image dans la zone d'édition déclenche un upload (comme le bouton image)
 * - La taille d'une image peut être définie à l'insertion
 * - Cliquer sur une image permet de modifier sa taille
 *
 * La page Settings (onglet Profil) est utilisée car sa description utilise
 * le WysiwygEditor avec un callback d'upload réel (avatar utilisateur).
 */

// PNG 2x2 valide encodé en base64
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAADklEQVR4nGP4z8DAgMAAH+8D/STLRHYAAAAASUVORK5CYII=';
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;

test.describe('Wysiwyg - Images (collage et taille)', () => {
  let settingsPage: SettingsPage;
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    registerPage = new RegisterPage(page);

    // Créer un utilisateur unique et se connecter (l'inscription connecte automatiquement)
    const username = `e2e_img_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');

    // Aller sur la page des paramètres (l'onglet Profil est actif par défaut)
    await settingsPage.navigate();
    await settingsPage.switchToProfileTab();
  });

  test('Coller une image dans la zone d\'édition déclenche un upload', async ({ page }) => {
    const editor = page.locator('div[contenteditable="true"]');
    await expect(editor).toBeVisible();
    await editor.click();

    // Simuler un Ctrl+V d'une image (clipboard contenant un fichier PNG)
    await page.evaluate((b64) => {
      const target = document.querySelector('div[contenteditable="true"]');
      if (!target) throw new Error('Zone éditable introuvable');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'image-colle.png', { type: 'image/png' }));
      const ev = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(ev);
    }, TINY_PNG_BASE64);

    // L'image insérée doit provenir d'un upload serveur (pas d'un data: URL inline)
    const img = editor.locator('img');
    await expect(img).toHaveCount(1, { timeout: 10000 });
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.startsWith('data:')).toBe(false);
    expect(src!).toMatch(/\/files\//);
  });

  test('La taille d\'une image peut être définie lors de l\'insertion', async ({ page }) => {
    const editor = page.locator('div[contenteditable="true"]');
    await expect(editor).toBeVisible();

    // Ouvrir le modal image, mode URL Web
    await page.locator('button[title*="image" i]').first().click();
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Insérer une image' });
    await modal.getByRole('button', { name: 'URL Web' }).click();
    await modal.locator('input[placeholder="https://example.com/image.png"]').fill(TINY_PNG_DATA_URL);

    // Définir une largeur à l'insertion
    await modal.getByLabel('Largeur').fill('150');
    await modal.getByRole('button', { name: "Insérer l'image" }).click();

    const img = editor.locator('img');
    await expect(img).toHaveCount(1, { timeout: 10000 });
    await expect
      .poll(async () => img.evaluate((el) => (el as HTMLImageElement).style.width))
      .toBe('150px');
  });

  test('Cliquer sur une image permet de modifier sa taille', async ({ page }) => {
    const editor = page.locator('div[contenteditable="true"]');
    await expect(editor).toBeVisible();

    // Insérer une image via le modal (URL Web) avec une taille initiale
    await page.locator('button[title*="image" i]').first().click();
    const insertModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Insérer une image' });
    await insertModal.getByRole('button', { name: 'URL Web' }).click();
    await insertModal
      .locator('input[placeholder="https://example.com/image.png"]')
      .fill(TINY_PNG_DATA_URL);
    await insertModal.getByLabel('Largeur').fill('150');
    await insertModal.getByRole('button', { name: "Insérer l'image" }).click();

    const img = editor.locator('img');
    await expect(img).toHaveCount(1, { timeout: 10000 });

    // Cliquer sur l'image insérée ouvre le modal d'édition
    await img.click();
    const editModal = page.locator('div.fixed.inset-0').filter({ hasText: "Modifier l'image" });
    await expect(editModal).toBeVisible();

    // Modifier la largeur
    await editModal.getByLabel('Largeur').fill('320');
    await editModal.getByRole('button', { name: 'Appliquer' }).click();

    await expect
      .poll(async () => img.evaluate((el) => (el as HTMLImageElement).style.width))
      .toBe('320px');
  });
});

test.describe('Wysiwyg - Images sans callback onUploadImage (messagerie)', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);

    // Créer un utilisateur unique et se connecter (l'inscription connecte automatiquement)
    const username = `e2e_mp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await registerPage.navigate();
    await registerPage.register(username, `${username}@example.com`, 'password123');

    // La page de composition d'un message privé utilise le WysiwygEditor SANS onUploadImage
    await page.goto('/messagerie?tab=compose');
    await expect(page.locator('div[contenteditable="true"]')).toBeVisible();
  });

  test('Coller une image dans la messagerie l\'upload vers files/ (pas de base64)', async ({ page }) => {
    const editor = page.locator('div[contenteditable="true"]');
    await editor.click();

    await page.evaluate((b64) => {
      const target = document.querySelector('div[contenteditable="true"]');
      if (!target) throw new Error('Zone éditable introuvable');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'image-colle.png', { type: 'image/png' }));
      const ev = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(ev);
    }, TINY_PNG_BASE64);

    const img = editor.locator('img');
    await expect(img).toHaveCount(1, { timeout: 10000 });
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.startsWith('data:')).toBe(false);
    expect(src!).toMatch(/^\/files\/editor\/\d+\/[a-f0-9]{32}\.png$/);
  });

  test('Déposer une image par drag-n-drop dans la messagerie l\'upload vers files/ (pas de base64)', async ({ page }) => {
    const editor = page.locator('div[contenteditable="true"]');
    await editor.click();

    await page.evaluate((b64) => {
      const target = document.querySelector('div[contenteditable="true"]');
      if (!target) throw new Error('Zone éditable introuvable');
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'image-deposee.png', { type: 'image/png' }));

      const dragOver = new DragEvent('dragover', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(dragOver);

      const drop = new DragEvent('drop', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(drop);
    }, TINY_PNG_BASE64);

    const img = editor.locator('img');
    await expect(img).toHaveCount(1, { timeout: 10000 });
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src!.startsWith('data:')).toBe(false);
    expect(src!).toMatch(/^\/files\/editor\/\d+\/[a-f0-9]{32}\.png$/);
  });
});
