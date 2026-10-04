/**
 * Badge de favicon : affiche le nombre de notifications non lues
 * directement sur la favicon de l'onglet en injectant un badge
 * (cercle rouge + compteur) dans le SVG de la favicon courante.
 * Les dépendances navigateur (document, fetch) sont injectables
 * pour permettre les tests unitaires sans DOM.
 */

const MAX_DISPLAYED_COUNT = 99;
const FALLBACK_VIEWBOX_SIZE = 100;
const BADGE_COLOR = '#2563eb';
const BADGE_TEXT_COLOR = '#ffffff';

interface DocumentLike {
  querySelector(selector: string): unknown;
}

interface LinkLike {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
}

export interface FaviconBadgeDeps {
  document?: DocumentLike | null;
  fetchImpl?: ((url: string) => Promise<{ text(): Promise<string> }>) | null;
}

/** Dernier href original connu de la favicon (avant transformation en data URL). */
let cachedOriginalHref: string | null = null;

/**
 * Libellé à afficher dans le badge, ou null s'il n'y a rien à montrer.
 * Les comptes au-delà de 99 sont plafonnés à "99+".
 */
export function getBadgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }
  if (count > MAX_DISPLAYED_COUNT) {
    return `${MAX_DISPLAYED_COUNT}+`;
  }
  return String(Math.floor(count));
}

/**
 * Extrait la taille de dessin d'un SVG (viewBox, puis width/height),
 * avec une valeur par défaut si aucune n'est présente.
 */
function resolveViewBoxSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]*)"/);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const widthMatch = svg.match(/\bwidth\s*=\s*"(\d+(?:\.\d+)?)"/);
  const heightMatch = svg.match(/\bheight\s*=\s*"(\d+(?:\.\d+)?)"/);
  if (widthMatch && heightMatch) {
    return { width: Number(widthMatch[1]), height: Number(heightMatch[1]) };
  }
  return { width: FALLBACK_VIEWBOX_SIZE, height: FALLBACK_VIEWBOX_SIZE };
}

/**
 * Construit le SVG du badge (cercle + libellé) à injecter,
 * positionné dans le coin bas-droit du viewBox.
 */
function buildBadgeMarkup(width: number, height: number, label: string): string {
  const base = Math.min(width, height);
  const radius = base * (label.length > 2 ? 0.42 : 0.33);
  const margin = base * 0.02;
  const cx = width - radius - margin;
  const cy = radius + margin;
  const fontSize = radius * (label.length > 2 ? 0.9 : 1.15);
  const textY = cy + fontSize * 0.35;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${BADGE_COLOR}"/>` +
    `<text x="${cx}" y="${textY}" font-family="Arial, sans-serif" font-size="${fontSize}" ` +
    `font-weight="bold" text-anchor="middle" fill="${BADGE_TEXT_COLOR}">${label}</text>`
  );
}

/**
 * Injecte le badge dans le SVG original, juste avant la balise fermante.
 */
export function buildBadgedFaviconSvg(originalSvg: string, label: string): string {
  const { width, height } = resolveViewBoxSize(originalSvg);
  const badge = buildBadgeMarkup(width, height, label);
  const closingIndex = originalSvg.lastIndexOf('</svg>');
  if (closingIndex === -1) {
    return `${originalSvg}${badge}</svg>`;
  }
  return `${originalSvg.slice(0, closingIndex)}${badge}${originalSvg.slice(closingIndex)}`;
}

/**
 * Encode un SVG en data URL utilisable comme href de favicon.
 */
export function toFaviconDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Met à jour la favicon : badge avec le nombre de notifications,
 * ou restaure la favicon originale quand le compte retombe à zéro.
 * Ne lève jamais : en cas d'échec, la favicon reste inchangée.
 */
export async function setFaviconBadgeCount(count: number, deps?: FaviconBadgeDeps): Promise<void> {
  const doc = deps?.document ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    return;
  }
  const link = doc.querySelector('link[rel="icon"]') as LinkLike | null;
  if (!link || typeof link.getAttribute !== 'function') {
    return;
  }

  const currentHref = link.getAttribute('href');
  if (!currentHref) {
    return;
  }
  if (!currentHref.startsWith('data:')) {
    cachedOriginalHref = currentHref;
  }

  const label = getBadgeLabel(count);
  const originalHref = cachedOriginalHref ?? currentHref;
  if (!label) {
    link.setAttribute('href', originalHref);
    return;
  }

  const fetchFn = deps?.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  if (!fetchFn) {
    return;
  }

  try {
    const response = await fetchFn(originalHref);
    const svgText = await response.text();
    link.setAttribute('href', toFaviconDataUrl(buildBadgedFaviconSvg(svgText, label)));
  } catch {
    // favicon inchangée si le SVG ne peut pas être récupéré
  }
}
