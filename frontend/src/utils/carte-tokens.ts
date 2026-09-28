// Géométrie des pions (tokens) affichés sur les cartes de campagne.
// Un pion est une "épingle" : un badge circulaire surmontant une petite
// pointe triangulaire. L'extrémité basse de la pointe repose exactement
// sur la position enregistrée du marqueur, ce qui laisse le point
// d'ancrage visible même quand le badge le recouvre en partie.

export interface PinGeometry {
  /** Taille du badge circulaire (px, cf. w-11 h-11). */
  badgeSize: number;
  /** Demi-largeur de la pointe triangulaire (px). */
  triangleHalfWidth: number;
  /** Hauteur de la pointe triangulaire (px). */
  triangleHeight: number;
  /** Écart entre l'extrémité de la pointe et le haut de l'étiquette (px). */
  labelGap: number;
  /** Décalage du badge au-dessus de l'ancre : la base du badge repose sur la pointe. */
  badgeBottomOffset: number;
  /** Décalage vertical de l'étiquette sous l'ancre (px). */
  labelTop: number;
}

export const PIN_GEOMETRY: PinGeometry = {
  badgeSize: 44,
  triangleHalfWidth: 7,
  triangleHeight: 11,
  labelGap: 2,
  badgeBottomOffset: 11,
  labelTop: 13,
};

// Le badge repose sur la base de la pointe, l'étiquette démarre sous la pointe.
if (PIN_GEOMETRY.badgeBottomOffset !== PIN_GEOMETRY.triangleHeight) {
  throw new Error('badgeBottomOffset doit correspondre à triangleHeight');
}
if (PIN_GEOMETRY.labelTop < PIN_GEOMETRY.triangleHeight + PIN_GEOMETRY.labelGap) {
  throw new Error("labelTop doit laisser la pointe visible au-dessus de l'étiquette");
}

export interface PinAnchorPosition {
  left: number;
  top: number;
}

/**
 * Style d'ancrage du pion sur la carte : la position (extrémité de la
 * pointe) est utilisée telle quelle, sans centrage sur le badge.
 * Le contredézoomage du zoom carte est appliqué séparément via
 * getPinCounterScaleStyle.
 */
export function getPinAnchorStyle(position: PinAnchorPosition): {
  left: string;
  top: string;
} {
  return {
    left: `${position.left}px`,
    top: `${position.top}px`,
  };
}

/**
 * Contredézoomage du pion : la carte est rendue dans un calque mis à
 * l'échelle par le zoom, et le pion annule localement cette échelle
 * (scale(1/zoom)) pour conserver une taille constante à l'écran.
 * L'origine du contredézoomage est le coin haut-gauche du conteneur du
 * pion, c'est-à-dire la pointe, qui reste ainsi fixée sur la position
 * enregistrée du marqueur.
 */
export function getPinCounterScaleStyle(zoom: number): {
  transform: string;
  transformOrigin: string;
} {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return {
    transform: `scale(${1 / safeZoom})`,
    transformOrigin: 'left top',
  };
}

export interface PinPointeState {
  isOwner: boolean;
  isDraggable: boolean;
}

/**
 * Couleur de la pointe, alignée sur le fond du badge :
 * emerald pour son propre personnage, indigo pour un pion déplaçable,
 * slate pour les autres.
 */
export function getPinPointeColor(state: PinPointeState): string {
  if (state.isOwner) return '#10b981';
  if (state.isDraggable) return '#4f46e5';
  return '#334155';
}
