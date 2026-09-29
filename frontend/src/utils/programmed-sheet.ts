import {
  SheetComponent,
  SheetComponentType,
  SheetDefinition,
  SheetElement,
  SheetMode,
  SheetPage,
  SheetSection,
  SheetSectionLayout,
} from '../types/campaign';

let idCounter = 0;

/**
 * Génère un identifiant unique (préfixe + compteur + aléa court)
 * pour les pages, sections et composants de la fiche programmée.
 */
export function generateSheetId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createEmptyPage(title = 'Nouvelle page'): SheetPage {
  return {
    id: generateSheetId('page'),
    title,
    sections: [],
  };
}

export function createEmptySection(layout: SheetSectionLayout = 'vertical'): SheetSection {
  return {
    id: generateSheetId('sec'),
    title: '',
    layout,
    children: [],
  };
}

export function createComponent(type: SheetComponentType): SheetComponent {
  const component: SheetComponent = {
    id: generateSheetId('comp'),
    type,
    label: '',
  };
  if (type === 'select' || type === 'radio') {
    component.options = ['Option 1'];
  }
  if (type === 'scoring') {
    component.max = 5;
  }
  return component;
}

export function createEmptyDefinition(): SheetDefinition {
  return {
    version: 1,
    pages: [createEmptyPage('Page 1')],
  };
}

/**
 * Normalise le format historique (sections avec `components` + `sections`
 * séparés) vers le format unifié `children` : composants puis sous-sections,
 * récursivement (l'ordre de rendu historique est préservé).
 */
function normalizeLegacyElement(element: unknown): unknown {
  if (!element || typeof element !== 'object' || Array.isArray(element)) {
    return element;
  }
  const el = element as Record<string, unknown>;
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

function normalizeDefinitionPages(parsed: Record<string, unknown>): unknown {
  if (!Array.isArray(parsed.pages)) {
    return parsed;
  }
  return {
    ...parsed,
    pages: (parsed.pages as Array<Record<string, unknown>>).map((page) => ({
      ...page,
      sections: Array.isArray(page.sections)
        ? (page.sections as unknown[]).map(normalizeLegacyElement)
        : page.sections,
    })),
  };
}

/**
 * Indique si un enfant de section est une sous-section.
 */
export function isSheetSection(element: SheetElement): element is SheetSection {
  return 'layout' in element;
}

/**
 * Analyse la définition de fiche stockée en base (JSON).
 * Le format historique est normalisé vers `children`.
 * Retourne null si absente ou invalide.
 */
export function parseSheetDefinition(raw?: string | null): SheetDefinition | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      Array.isArray(parsed.pages)
    ) {
      return normalizeDefinitionPages(parsed) as SheetDefinition;
    }
    return null;
  } catch {
    return null;
  }
}

export type SheetValues = Record<string, string | number>;

/**
 * Analyse les valeurs de fiche d'un personnage (JSON clé/valeur).
 */
export function parseSheetValues(raw?: string | null): SheetValues {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as SheetValues;
    }
    return {};
  } catch {
    return {};
  }
}

export function serializeSheetValues(values: SheetValues): string {
  return JSON.stringify(values);
}

/**
 * Miroir frontend de la dérivation backend :
 * un mode explicite s'il est valide, sinon 'graphic' si un template
 * graphique existe, sinon 'technical'.
 */
export function resolveSheetMode(campaign: {
  sheetMode?: SheetMode | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}): SheetMode {
  if (campaign.sheetMode && ['technical', 'graphic', 'programmed'].includes(campaign.sheetMode)) {
    return campaign.sheetMode;
  }
  const hasGraphicTemplate = Boolean(
    campaign.templateHtml?.trim() ||
    campaign.templateImg?.trim() ||
    campaign.templateFields?.trim()
  );
  return hasGraphicTemplate ? 'graphic' : 'technical';
}

export const SHEET_COMPONENT_TYPE_LABELS: Record<SheetComponentType, string> = {
  text: 'Champ texte',
  textarea: 'Zone de texte',
  number: 'Champ numérique',
  select: 'Liste déroulante',
  radio: 'Boutons radio',
  scoring: 'Scoring (points)',
  label: 'Label',
};
