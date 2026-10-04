/**
 * Stoppe un événement de clic sur un bouton imbriqué dans un lien :
 * - stopPropagation : les handlers React du parent (la carte) ne se déclenchent pas
 * - preventDefault : le navigateur ne suit pas le href du lien parent
 *
 * Nécessaire car stopPropagation seul n'annule pas l'action par défaut
 * de l'ancre englobante.
 */
export function stopEvent(e: {
  stopPropagation(): void;
  preventDefault(): void;
}): void {
  e.stopPropagation();
  e.preventDefault();
}
