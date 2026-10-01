// Utilitaires de gestion du scroll auto du tchat :
// le scroll vers le bas automatique ne doit reprendre que si
// l'utilisateur est (re)venu proche du bas de la zone de messages.

export const SCROLL_BOTTOM_THRESHOLD_PX = 40;

/**
 * Indique si la position de scroll est proche du bas du conteneur.
 * Utilisé pour décider si un nouveau message doit déclencher un scroll auto.
 */
export function isNearBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold: number = SCROLL_BOTTOM_THRESHOLD_PX
): boolean {
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  return distanceFromBottom <= threshold;
}
