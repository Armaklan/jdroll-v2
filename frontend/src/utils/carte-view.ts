/**
 * Cadrage de la vue carte : calcul du zoom d'ajustement et du décalage (pan)
 * pour qu'une carte soit centrée dans la zone d'affichage.
 *
 * Le pan positionne le coin haut-gauche de l'image (origin-top-left) dans la
 * zone : le conteneur doit ancrer l'image en left:0/top:0, sans centrage flex
 * additionnel.
 */

export interface FitViewInput {
  width: number;
  height: number;
}

export interface FitView {
  zoom: number;
  pan: { x: number; y: number };
}

/** Marge totale conservée autour de la carte une fois ajustée. */
const FIT_MARGIN = 40;
export const MIN_ZOOM = 0.2;
/** Plafond du zoom d'ajustement initial. */
const FIT_MAX_ZOOM = 1.5;
/** Plafond du zoom manuel (molette, boutons, pincement). */
export const MAX_ZOOM = 5;

/**
 * Calcule le zoom qui fait tenir l'image dans la zone (marge comprise) et le
 * pan qui la centre, quelles que soient ses dimensions réelles.
 */
export function computeFitView(imageSize: FitViewInput, containerSize: FitViewInput): FitView {
  if (
    !imageSize.width ||
    !imageSize.height ||
    !containerSize.width ||
    !containerSize.height
  ) {
    return { zoom: 1, pan: { x: 0, y: 0 } };
  }

  const scaleX = (containerSize.width - FIT_MARGIN) / imageSize.width;
  const scaleY = (containerSize.height - FIT_MARGIN) / imageSize.height;
  const zoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), FIT_MAX_ZOOM);

  return {
    zoom,
    pan: {
      x: (containerSize.width - imageSize.width * zoom) / 2,
      y: (containerSize.height - imageSize.height * zoom) / 2,
    },
  };
}

export interface PinchGesture {
  /** Milieu des deux doigts avant le geste, en coordonnées de la zone d'affichage. */
  previousMid: { x: number; y: number };
  /** Milieu des deux doigts après le geste, en coordonnées de la zone d'affichage. */
  currentMid: { x: number; y: number };
  previousDist: number;
  currentDist: number;
}

/**
 * Calcule la vue résultant d'un pincement à deux doigts : le zoom suit le
 * rapport des écarts entre doigts (borné), et le point image situé sous le
 * milieu du pincement reste sous les doigts.
 */
export function computePinchView(view: FitView, gesture: PinchGesture): FitView {
  const { previousMid, currentMid, previousDist, currentDist } = gesture;
  if (!(previousDist > 0) || !(currentDist > 0) || !(view.zoom > 0)) {
    return view;
  }

  const zoom = Math.min(
    Math.max(view.zoom * (currentDist / previousDist), MIN_ZOOM),
    MAX_ZOOM
  );

  return {
    zoom,
    pan: {
      x: currentMid.x - ((previousMid.x - view.pan.x) / view.zoom) * zoom,
      y: currentMid.y - ((previousMid.y - view.pan.y) / view.zoom) * zoom,
    },
  };
}
