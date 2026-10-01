import { expect, APIRequestContext } from '@playwright/test';
import { deflateSync, crc32 } from 'node:zlib';

/**
 * Helpers de seed des cartes pour les tests e2e :
 * génération d'images PNG de dimensions exactes + création d'une campagne
 * avec une carte publiée.
 */

/**
 * Génère un PNG RGB plein d'une couleur unie (sans dépendance externe).
 */
export function buildSolidPng(
  width: number,
  height: number,
  rgb: [number, number, number]
): Buffer {
  const bytesPerPixel = 3;
  const rowLength = width * bytesPerPixel;
  const raw = Buffer.alloc((rowLength + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowLength + 1);
    raw[rowStart] = 0; // filtre "none" pour chaque ligne
    for (let x = 0; x < rowLength; x += bytesPerPixel) {
      raw[rowStart + 1 + x] = rgb[0];
      raw[rowStart + 1 + x + 1] = rgb[1];
      raw[rowStart + 1 + x + 2] = rgb[2];
    }
  }

  const chunk = (type: string, data: Buffer): Buffer => {
    const typeBuf = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
    return Buffer.concat([length, typeBuf, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur : 8 bits
  ihdr[9] = 2; // couleur : RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filtre
  ihdr[12] = 0; // entrelacement

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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
    throw new Error(`Échec de l'inscription de ${username} (${response.status})`);
  }
  return response.json();
}

export interface SeededCarte {
  campaignId: number;
  carteId: number;
  token: string;
}

/**
 * Crée une campagne et une carte publiée portant l'image fournie.
 */
export async function seedCarte(
  request: APIRequestContext,
  png: Buffer,
  name: string,
  config: Record<string, unknown> = {}
): Promise<SeededCarte> {
  const suffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  const { token } = await registerUser(request, `e2e_carte_${suffix}`);

  const createResponse = await request.post('/api/campaigns', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: `Campagne test cartes ${suffix}`,
      systeme: 'D&D 5e',
      univers: 'Test',
      description: "Campagne de test de l'affichage des cartes",
      nbJoueurs: 4,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const { campaign } = await createResponse.json();

  const uploadResponse = await request.post(
    `/api/campaigns/${campaign.id}/cartes/upload-image`,
    {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: 'carte.png', mimeType: 'image/png', buffer: png },
      },
    }
  );
  expect(uploadResponse.ok()).toBeTruthy();
  const { url } = await uploadResponse.json();

  const carteResponse = await request.post(`/api/campaigns/${campaign.id}/cartes`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, image: url, published: true, config },
  });
  expect(carteResponse.ok()).toBeTruthy();
  const { id: carteId } = await carteResponse.json();

  return { campaignId: campaign.id, carteId, token };
}

/**
 * Authentifie le navigateur avec le token fourni (les pages campagne exigent d'être connecté).
 */
export async function setBrowserToken(
  page: import('@playwright/test').Page,
  token: string
): Promise<void> {
  await page.addInitScript((token: string) => {
    localStorage.setItem('jdroll_token', token);
  }, token);
}
