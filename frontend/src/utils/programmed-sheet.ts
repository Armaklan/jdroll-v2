import {
  SheetComponent,
  SheetComponentType,
  SheetDefinition,
  SheetElement,
  SheetElementPosition,
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
 * Style inline de fond de section : undefined (transparent par défaut)
 * si aucune couleur valide n'est configurée.
 */
export function sectionBackgroundStyle(
  backgroundColor?: string | null
): { backgroundColor: string } | undefined {
  if (!backgroundColor || !backgroundColor.trim()) return undefined;
  return { backgroundColor };
}

/**
 * Style inline de fond de page : undefined si aucune image n'est configurée,
 * sinon une image de fond couvrante, centrée, sans répétition.
 */
export function pageBackgroundStyle(
  backgroundImage?: string | null
):
  | {
      backgroundImage: string;
      backgroundSize: string;
      backgroundPosition: string;
      backgroundRepeat: string;
    }
  | undefined {
  if (!backgroundImage || !backgroundImage.trim()) return undefined;
  // Les guillemets doubles sont neutralisés pour éviter toute sortie du
  // contexte CSS url("...")
  const safeUrl = backgroundImage.replace(/"/g, '');
  return {
    backgroundImage: `url("${safeUrl}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}

/** Largeur minimale (px) d'un élément redimensionné en layout libre. */
export const FREE_ELEMENT_MIN_WIDTH = 120;
/** Hauteur minimale (px) d'un élément redimensionné en layout libre. */
export const FREE_ELEMENT_MIN_HEIGHT = 40;

/**
 * Style inline d'un enfant de section libre : positionnement absolu
 * à la position enregistrée (origine par défaut), avec sa largeur
 * redimensionnée le cas échéant.
 */
export function freeChildStyle(
  position?: SheetElementPosition | null,
  width?: number
):
  | { position: 'absolute'; top: number; left: number; width?: number }
  | { position: 'absolute'; top: number; left: number } {
  const style: { position: 'absolute'; top: number; left: number; width?: number } = {
    position: 'absolute',
    top: position?.top ?? 0,
    left: position?.left ?? 0,
  };
  if (width !== undefined) {
    style.width = width;
  }
  return style;
}

/**
 * Calcule la nouvelle taille d'un élément redimensionné en layout libre :
 * taille de départ + déplacement du pointeur, arrondie et bornée au minimum.
 */
export function computeFreeResize(input: {
  startWidth: number;
  startHeight: number;
  pointerDx: number;
  pointerDy: number;
}): { width: number; height: number } {
  return {
    width: Math.max(
      FREE_ELEMENT_MIN_WIDTH,
      Math.round(input.startWidth + input.pointerDx)
    ),
    height: Math.max(
      FREE_ELEMENT_MIN_HEIGHT,
      Math.round(input.startHeight + input.pointerDy)
    ),
  };
}

/** Hauteur initiale du canevas d'une section libre (px). */
export const FREE_SECTION_DEFAULT_HEIGHT = 240;
/** Marge intérieure du canevas libre et des positions par défaut (px). */
export const FREE_SECTION_PADDING = 16;
/** Décalage vertical entre deux enfants empilés par défaut (px). */
export const FREE_POSITION_STEP = 64;

/** Taille minimale (px) d'un enfant étiré dans une section en flux. */
export const FLOW_ELEMENT_MIN_SIZE = 40;

/**
 * Redistribue les tailles des enfants d'une section en flux quand l'un
 * d'eux est étiré : la taille gagnée est perdue proportionnellement par
 * les autres, la somme des tailles est conservée. L'enfant étiré est
 * borné pour ne jamais descendre sous la taille minimale, ni écraser
 * ses frères sous la leur.
 */
export function computeFlowStretch(input: {
  sizes: number[];
  index: number;
  delta: number;
  minSize?: number;
}): number[] {
  const min = input.minSize ?? FLOW_ELEMENT_MIN_SIZE;
  const { sizes, index } = input;
  if (sizes.length <= 1 || index < 0 || index >= sizes.length) {
    return [...sizes];
  }
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const maxStretched = total - min * (sizes.length - 1);
  const stretched = Math.max(min, Math.min(maxStretched, sizes[index] + input.delta));
  const sumOthers = total - sizes[index];
  const remaining = total - stretched;
  return sizes.map((size, i) => {
    if (i === index) return Math.round(stretched);
    if (sumOthers <= 0) return Math.round(size);
    return Math.round((size / sumOthers) * remaining);
  });
}

/**
 * Poids de répartition par défaut d'un enfant ajouté dans une section
 * dont les frères ont déjà des poids : moyenne des poids existants.
 * Retourne null si aucun frère n'a de poids (répartition naturelle).
 */
export function defaultFlowWeight(children: SheetElement[]): number | null {
  const weights = children
    .map((child) => child.sizeWeight)
    .filter((weight): weight is number => weight !== undefined);
  if (weights.length === 0) return null;
  return weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
}

/**
 * Style inline d'un enfant pondéré dans une section en flux : le poids
 * (taille en px mesurée à l'étirement) sert de taille de base au
 * flex-basis, sans croissance — le rendu est fidèle au geste et
 * insensible aux heuristiques de taille minimale de contenu qui
 * faussent la distribution par flex-grow. Le minimum automatique des
 * flex items (hauteur de contenu) est levé pour que la redistribution
 * verticale ne soit pas figée par le contenu.
 */
export function flowChildStyle(weight: number): {
  flexGrow: number;
  flexBasis: string;
  minHeight: number;
} {
  return { flexGrow: 0, flexBasis: `${weight}px`, minHeight: 0 };
}

/** Largeur fixe (px) d'une page dont le fond est une image. */
export const FIXED_PAGE_WIDTH = 800;

/**
 * Taille fixe d'une page à partir des dimensions naturelles de son image
 * de fond : largeur 800px, hauteur au ratio de l'image (minimum 1px).
 * Dimensions illisibles → carré 800x800.
 */
export function fixedPageSize(
  naturalWidth: number,
  naturalHeight: number,
  targetWidth = FIXED_PAGE_WIDTH
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: targetWidth, height: targetWidth };
  }
  return {
    width: targetWidth,
    height: Math.max(1, Math.round((naturalHeight * targetWidth) / naturalWidth)),
  };
}

/**
 * Calcule le placement libre d'un enfant déposé au pointeur :
 * top/left bornés à 0, et hauteur du canevas agrandie si nécessaire
 * pour contenir le bas de l'élément (avec marge).
 * grabOffsetTop/grabOffsetLeft : position du pointeur dans l'élément au
 * moment où il a été attrapé ; le placement ancre le coin haut-gauche de
 * l'élément tenu (et non le pointeur) aux coordonnées du dépôt.
 * maxHeight/maxWidth (page à taille fixée par une image de fond) :
 * le placement et la croissance sont plafonnés, impossible d'étendre
 * au-delà de la page.
 */
export function computeFreePlacement(input: {
  pointerTop: number;
  pointerLeft: number;
  itemWidth: number;
  itemHeight: number;
  currentHeight: number;
  grabOffsetTop?: number;
  grabOffsetLeft?: number;
  maxHeight?: number;
  maxWidth?: number;
}): { top: number; left: number; height: number } {
  let top = Math.max(0, Math.round(input.pointerTop - (input.grabOffsetTop ?? 0)));
  let left = Math.max(0, Math.round(input.pointerLeft - (input.grabOffsetLeft ?? 0)));
  if (input.maxHeight !== undefined) {
    top = Math.min(top, Math.max(0, input.maxHeight - input.itemHeight - FREE_SECTION_PADDING));
  }
  if (input.maxWidth !== undefined) {
    left = Math.min(left, Math.max(0, input.maxWidth - input.itemWidth - FREE_SECTION_PADDING));
  }
  const neededBottom = top + input.itemHeight + FREE_SECTION_PADDING;
  let height = Math.max(input.currentHeight, neededBottom);
  if (input.maxHeight !== undefined) {
    height = Math.min(height, input.maxHeight);
  }
  return { top, left, height };
}

/**
 * Position par défaut du prochain enfant ajouté à un canevas libre :
 * sous l'élément le plus bas déjà présent.
 */
export function nextFreePosition(
  children: SheetElement[]
): SheetElementPosition {
  if (children.length === 0) {
    return { top: FREE_SECTION_PADDING, left: FREE_SECTION_PADDING };
  }
  const lowestTop = Math.max(
    ...children.map((child) => child.position?.top ?? 0)
  );
  return { top: lowestTop + FREE_POSITION_STEP, left: FREE_SECTION_PADDING };
}

/**
 * Au passage en layout libre : attribue une position empilée aux
 * enfants qui n'en ont pas, et conserve les positions existantes.
 */
export function assignFreePositions(
  children: SheetElement[]
): SheetElement[] {
  let stack = 0;
  return children.map((child) => {
    if (child.position) return child;
    const position = {
      top: FREE_SECTION_PADDING + stack * FREE_POSITION_STEP,
      left: FREE_SECTION_PADDING,
    };
    stack += 1;
    return { ...child, position };
  });
}

function cloneElementWithFreshIds(element: SheetElement): SheetElement {
  if (isSheetSection(element)) {
    return {
      ...element,
      id: generateSheetId('sec'),
      children: element.children.map(cloneElementWithFreshIds),
    };
  }
  const { options, ...rest } = element;
  return {
    ...rest,
    id: generateSheetId('comp'),
    ...(options ? { options: [...options] } : {}),
  };
}

/**
 * Duplique un élément (composant ou section, récursivement)
 * avec des identifiants régénérés pour toute la copie.
 */
export function duplicateSheetElement(element: SheetElement): SheetElement {
  return cloneElementWithFreshIds(element);
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
