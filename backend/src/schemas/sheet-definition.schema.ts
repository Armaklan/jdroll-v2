import { z } from 'zod';

/**
 * Schéma de définition d'une feuille de personnage programmée.
 * Une fiche est composée de pages, contenant des sections récursives
 * disposant d'un layout (horizontal / vertical / libre) et de composants.
 */

export const SHEET_SECTION_LAYOUTS = ['horizontal', 'vertical', 'free'] as const;
export type SheetSectionLayout = (typeof SHEET_SECTION_LAYOUTS)[number];

export const SHEET_COMPONENT_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'scoring',
  'label',
] as const;
export type SheetComponentType = (typeof SHEET_COMPONENT_TYPES)[number];

export const SHEET_LABEL_POSITIONS = ['above', 'left'] as const;
export type SheetLabelPosition = (typeof SHEET_LABEL_POSITIONS)[number];

const HEX_COLOR_REGEX =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Position d'un élément dans une section en positionnement libre (px).
 */
export const sheetElementPositionSchema = z.object({
  top: z.number().int().min(0).max(10000),
  left: z.number().int().min(0).max(10000),
});
export type SheetElementPosition = z.infer<typeof sheetElementPositionSchema>;

export const sheetComponentSchema = z.intersection(
  z.object({
    id: z.string().min(1).max(100),
    type: z.enum(SHEET_COMPONENT_TYPES),
    label: z.string().max(200),
    helpText: z.string().max(500).optional(),
    defaultValue: z.union([z.string().max(2000), z.number()]).optional(),
    labelPosition: z.enum(SHEET_LABEL_POSITIONS).optional(),
    position: sheetElementPositionSchema.optional(),
    /** Largeur (px) redimensionnée en positionnement libre. */
    width: z.number().int().min(1).max(10000).optional(),
    /**
     * Poids de répartition de la taille (largeur en horizontal, hauteur
     * en vertical) parmi les frères de la section ; taille (px) mesurée
     * à l'étirement, rendue en flex-basis.
     */
    sizeWeight: z.number().positive().max(100000).optional(),
  }),
  z.union([
    z.object({
      type: z.literal('select'),
      options: z.array(z.string().min(1)).min(1),
    }),
    z.object({
      type: z.literal('radio'),
      options: z.array(z.string().min(1)).min(1),
    }),
    z.object({
      type: z.literal('scoring'),
      max: z.number().int().min(0),
    }),
    z.object({
      type: z.enum(['text', 'textarea', 'number', 'label']),
    }),
  ])
);

export type SheetComponent = z.infer<typeof sheetComponentSchema>;

export interface SheetSection {
  id: string;
  title?: string;
  layout: SheetSectionLayout;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  height?: number;
  /** Position dans la section parente en positionnement libre. */
  position?: SheetElementPosition;
  /** Largeur (px) redimensionnée en positionnement libre. */
  width?: number;
  /**
   * Enfants de la section : composants et sous-sections mélangés,
   * dans un ordre libre (le layout de la section s'applique à l'ensemble).
   */
  children: Array<SheetComponent | SheetSection>;
}

const sheetSectionCoreSchema: z.ZodType<SheetSection> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(100),
    title: z.string().max(200).optional(),
    layout: z.enum(SHEET_SECTION_LAYOUTS),
    borderWidth: z.number().int().min(0).max(10).optional(),
    borderColor: z
      .string()
      .regex(HEX_COLOR_REGEX, 'Couleur de bordure invalide (format hexadécimal attendu)')
      .optional(),
    backgroundColor: z
      .string()
      .regex(HEX_COLOR_REGEX, 'Couleur de fond invalide (format hexadécimal attendu)')
      .optional(),
    height: z.number().int().min(1).max(10000).optional(),
    position: sheetElementPositionSchema.optional(),
    /** Largeur (px) redimensionnée en positionnement libre. */
    width: z.number().int().min(1).max(10000).optional(),
    /** Poids de répartition de la taille parmi les frères (ratio). */
    sizeWeight: z.number().positive().max(100000).optional(),
    children: z.array(
      z.union([sheetSectionCoreSchema, sheetComponentSchema])
    ),
  })
);

// Alias historique conservé pour les imports existants
export const sheetSectionSchema = sheetSectionCoreSchema;

type PossiblyLegacySection = {
  children?: unknown;
  components?: unknown;
  sections?: unknown;
  [key: string]: unknown;
};

/**
 * Normalise le format historique (sections avec `components` + `sections`
 * séparés) vers le format unifié `children` (composants puis sous-sections,
 * ce qui correspond à l'ordre de rendu historique). Récursif.
 */
function normalizeLegacyElement(element: unknown): unknown {
  if (!element || typeof element !== 'object' || Array.isArray(element)) {
    return element;
  }
  const el = element as PossiblyLegacySection;
  if (Array.isArray(el.children)) {
    return {
      ...el,
      children: (el.children as unknown[]).map(normalizeLegacyElement),
    };
  }
  if (Array.isArray(el.components) || Array.isArray(el.sections)) {
    const { components, sections, ...rest } = el;
    return {
      ...rest,
      children: [
        ...((components as unknown[]) ?? []).map(normalizeLegacyElement),
        ...((sections as unknown[]) ?? []).map(normalizeLegacyElement),
      ],
    };
  }
  return element;
}

function normalizeLegacyDefinition(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }
  const definition = input as { pages?: unknown };
  if (!Array.isArray(definition.pages)) {
    return input;
  }
  return {
    ...(input as Record<string, unknown>),
    pages: (definition.pages as Array<Record<string, unknown>>).map((page) => ({
      ...page,
      sections: Array.isArray(page.sections)
        ? (page.sections as unknown[]).map(normalizeLegacyElement)
        : page.sections,
    })),
  };
}

const sheetDefinitionCoreSchema = z.object({
  version: z.literal(1),
  pages: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        title: z.string().max(200),
        backgroundImage: z.string().min(1).max(2000).optional(),
        /** Taille fixe de la page (px) définie par son image de fond. */
        width: z.number().int().min(1).max(10000).optional(),
        height: z.number().int().min(1).max(10000).optional(),
        sections: z.array(sheetSectionCoreSchema),
      })
    )
    .max(50),
});

export const sheetDefinitionSchema = z.preprocess(
  normalizeLegacyDefinition,
  sheetDefinitionCoreSchema
);

export type SheetPage = z.infer<typeof sheetDefinitionSchema>['pages'][number];
export type SheetDefinition = z.infer<typeof sheetDefinitionSchema>;

function collectIds(definition: SheetDefinition): string[] {
  const ids: string[] = [];
  const visitSection = (section: SheetSection) => {
    ids.push(section.id);
    section.children.forEach((child) => {
      if ('layout' in child) {
        visitSection(child);
      } else {
        ids.push(child.id);
      }
    });
  };
  definition.pages.forEach((page) => {
    ids.push(page.id);
    page.sections.forEach(visitSection);
  });
  return ids;
}

/**
 * Valide une définition de fiche programmée :
 * structure (schéma Zod) + unicité des identifiants.
 */
export function validateSheetDefinition(
  input: unknown
): { success: true; data: SheetDefinition } | { success: false; error: z.ZodError } {
  const result = sheetDefinitionSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const ids = collectIds(result.data);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: ['pages'],
          message: `Identifiants dupliqués dans la définition de fiche : ${[...new Set(duplicates)].join(', ')}`,
        },
      ]),
    };
  }

  return { success: true, data: result.data };
}

export const SHEET_MODES = ['technical', 'graphic', 'programmed'] as const;
export type SheetMode = (typeof SHEET_MODES)[number];

export const sheetModeSchema = z.enum(SHEET_MODES);

interface SheetModeSource {
  sheetMode?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}

/**
 * Résout le mode de feuille de personnage d'une campagne :
 * - mode explicite stocké en base s'il est valide,
 * - sinon dérivation de l'existant : un template graphique présent → 'graphic',
 *   sinon 'technical'.
 */
export function resolveSheetMode(campaign: SheetModeSource): SheetMode {
  const stored = campaign.sheetMode;
  if (stored && (SHEET_MODES as readonly string[]).includes(stored)) {
    return stored as SheetMode;
  }
  const hasGraphicTemplate = Boolean(
    campaign.templateHtml?.trim() ||
    campaign.templateImg?.trim() ||
    campaign.templateFields?.trim()
  );
  return hasGraphicTemplate ? 'graphic' : 'technical';
}
