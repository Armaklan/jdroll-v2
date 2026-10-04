import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { config } from '../config/env.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMG_SRC_PATTERN = /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']*)\2/gi;

export interface IImageDownloader {
  /**
   * Télécharge l'image sourceUrl dans files/<campagneId>/<filename>
   * et retourne l'URL jdroll correspondante, ou null en cas d'échec.
   */
  downloadToCampaign(campaignId: number, filename: string, sourceUrl: string): Promise<string | null>;

  /** Supprime le répertoire files/<campagneId> (réimport complet d'une campagne). */
  deleteCampaignFiles(campaignId: number): Promise<void>;
}

/** Seules les images référencées par une URL http(s) absolue sont téléchargeables. */
export function isDownloadableImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

/** Seules les images du domaine espritjdr.net sont rapatriées lors de la migration. */
export function isEspritJdrImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'espritjdr.net' || parsed.hostname.endsWith('.espritjdr.net'))
    );
  } catch {
    return false;
  }
}

function resolveImageExtension(sourceUrl: string): string {
  let extension = '';
  try {
    extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  } catch {
    extension = '';
  }
  return IMAGE_EXTENSIONS.includes(extension) ? extension : '.jpg';
}

/** Nom de fichier déterministe pour l'avatar d'un intervenant (reprise idempotente). */
export function buildAvatarFilename(intervenantId: number, sourceUrl: string): string {
  return `pnj-${intervenantId}${resolveImageExtension(sourceUrl)}`;
}

/** Nom de fichier déterministe pour une image inline, basé sur un hash de l'url. */
export function buildInlineImageFilename(sourceUrl: string): string {
  const hash = createHash('md5').update(sourceUrl).digest('hex');
  return `img-${hash}${resolveImageExtension(sourceUrl)}`;
}

/** Extrait les urls uniques des attributs src des balises img d'un contenu HTML. */
export function extractInlineImageUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of html.matchAll(IMG_SRC_PATTERN)) {
    const url = match[3];
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

/** Réécrit les src des images inline selon la correspondance url source -> url jdroll. */
export function replaceInlineImageUrls(html: string, replacements: Map<string, string>): string {
  return html.replace(IMG_SRC_PATTERN, (match, prefix: string, quote: string, url: string) => {
    const replacement = replacements.get(url);
    return replacement ? `${prefix}${quote}${replacement}${quote}` : match;
  });
}

export function buildCampaignFileUrl(campaignId: number, filename: string): string {
  return `/files/${campaignId}/${filename}`;
}

export class HttpImageDownloader implements IImageDownloader {
  constructor(private readonly baseDir: string = config.filesDir) {}

  async downloadToCampaign(
    campaignId: number,
    filename: string,
    sourceUrl: string
  ): Promise<string | null> {
    const url = buildCampaignFileUrl(campaignId, filename);
    const targetPath = path.join(this.baseDir, String(campaignId), filename);

    try {
      // Reprise : un fichier déjà téléchargé n'est pas retéléchargé
      if (fs.existsSync(targetPath)) {
        return url;
      }

      const response = await fetch(sourceUrl);
      if (!response.ok) {
        console.warn(`Image non téléchargée (HTTP ${response.status}) : ${sourceUrl}`);
        return null;
      }

      const content = Buffer.from(await response.arrayBuffer());
      if (content.length === 0 || content.length > MAX_IMAGE_BYTES) {
        console.warn(`Image ignorée (taille ${content.length} octets) : ${sourceUrl}`);
        return null;
      }

      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, content);
      return url;
    } catch (error) {
      console.warn(`Échec du téléchargement de ${sourceUrl} : ${(error as Error).message}`);
      return null;
    }
  }

  async deleteCampaignFiles(campaignId: number): Promise<void> {
    await fs.promises.rm(path.join(this.baseDir, String(campaignId)), {
      recursive: true,
      force: true,
    });
  }
}
