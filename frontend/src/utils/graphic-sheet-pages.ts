import { parseTemplateFields, TemplateField } from './character-sheet';

/**
 * Fiche graphique multi-pages : chaque page dispose de son propre fond
 * (image ou HTML) et de ses propres champs interactifs.
 * Le document JSON est stocké dans `campagne_config.sheet_pages`.
 */

export interface GraphicSheetPage {
  id: string;
  title: string;
  bgType: 'image' | 'html';
  image: string;
  html: string;
  templateFields: string;
}

interface RawSheetPage {
  id?: unknown;
  title?: unknown;
  bgType?: unknown;
  image?: unknown;
  html?: unknown;
  templateFields?: unknown;
}

export interface LegacyGraphicSheet {
  templateImg?: string | null;
  templateHtml?: string | null;
  templateFields?: string | null;
}

export function createGraphicPage(index: number): GraphicSheetPage {
  return {
    id: `graphic-page-${Date.now()}-${index}`,
    title: `Page ${index + 1}`,
    bgType: 'image',
    image: '',
    html: '',
    templateFields: '',
  };
}

/**
 * Parse le JSON `sheet_pages` d'une campagne en liste de pages.
 * Retombe sur une page unique reconstruite depuis les colonnes historiques
 * (`template_img` / `template_html` / `template_fields`) pour les fiches
 * graphiques mono-pages existantes.
 */
export function parseGraphicSheetPages(
  sheetPagesJson?: string | null,
  legacy?: LegacyGraphicSheet
): GraphicSheetPage[] {
  if (sheetPagesJson && sheetPagesJson.trim()) {
    try {
      const parsed = JSON.parse(sheetPagesJson) as { pages?: unknown };
      if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
        return (parsed.pages as RawSheetPage[]).map((page) => ({
          id: typeof page.id === 'string' && page.id ? page.id : createGraphicPage(0).id,
          title: typeof page.title === 'string' ? page.title : '',
          bgType: page.bgType === 'html' ? 'html' : 'image',
          image: typeof page.image === 'string' ? page.image : '',
          html: typeof page.html === 'string' ? page.html : '',
          templateFields: typeof page.templateFields === 'string' ? page.templateFields : '',
        }));
      }
    } catch {
      // JSON invalide : on retombe sur le format historique mono-page
    }
  }

  const legacyImg = legacy?.templateImg || '';
  const legacyHtml = legacy?.templateHtml || '';
  const legacyFields = legacy?.templateFields || '';
  return [
    {
      id: 'graphic-page-1',
      title: 'Page 1',
      bgType: legacyImg.trim() ? 'image' : 'html',
      image: legacyImg,
      html: legacyHtml,
      templateFields: legacyFields,
    },
  ];
}

/**
 * Sérialise une liste de pages au format JSON `sheet_pages`.
 */
export function serializeGraphicSheetPages(pages: GraphicSheetPage[]): string {
  return JSON.stringify({ version: 1, pages });
}

/**
 * Extrait les champs interactifs structurés d'une page.
 */
export function parseGraphicPageFields(page: GraphicSheetPage): {
  fields: TemplateField[];
  maxCount: number;
} {
  return parseTemplateFields(page.templateFields);
}
