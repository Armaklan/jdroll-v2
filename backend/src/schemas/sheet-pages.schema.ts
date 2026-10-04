import { z } from 'zod';

/**
 * Schéma d'une fiche graphique multi-pages.
 * Chaque page dispose de son propre fond (image ou HTML) et de ses
 * propres champs interactifs (format HTML historique `template_fields`,
 * sérialisés/désérialisés par le frontend).
 */

export const SHEET_PAGE_BG_TYPES = ['image', 'html'] as const;
export type SheetPageBgType = (typeof SHEET_PAGE_BG_TYPES)[number];

export const SHEET_PAGES_MAX = 20;

export const graphicSheetPageSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(200),
  bgType: z.enum(SHEET_PAGE_BG_TYPES),
  image: z.string().max(2000).optional(),
  html: z.string().max(200000).optional(),
  templateFields: z.string(),
});

export type GraphicSheetPage = z.infer<typeof graphicSheetPageSchema>;

export const sheetPagesSchema = z.object({
  version: z.literal(1),
  pages: z.array(graphicSheetPageSchema).min(1).max(SHEET_PAGES_MAX),
});

export type SheetPagesDocument = z.infer<typeof sheetPagesSchema>;

/**
 * Valide un document de fiche graphique multi-pages :
 * structure (schéma Zod) + unicité des identifiants de page.
 */
export function validateSheetPages(
  input: unknown
): { success: true; data: SheetPagesDocument } | { success: false; error: z.ZodError } {
  const result = sheetPagesSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const ids = result.data.pages.map((page) => page.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: ['pages'],
          message: `Identifiants de page dupliqués : ${[...new Set(duplicates)].join(', ')}`,
        },
      ]),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Sérialise une liste de pages en document JSON prêt à être
 * stocké dans `campagne_config.sheet_pages`.
 */
export function serializeSheetPages(pages: GraphicSheetPage[]): string {
  return JSON.stringify({ version: 1, pages });
}
