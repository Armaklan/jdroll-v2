// Détection d'un précédent dans l'historique du navigateur pour le
// bouton retour du viewer de carte. React Router stocke l'index de
// l'entrée courante de l'historique (idx) dans window.history.state :
// un idx > 0 signifie qu'il existe une page précédente dans le même
// onglet ; un idx = 0 correspond à une ouverture directe (nouvel
// onglet, lien externe, rechargement).

export interface HistoryStateWithIndex {
  idx?: number;
}

/**
 * Indique s'il existe une entrée précédente dans l'historique de
 * l'onglet courant (page ouverte par navigation interne, pas par un
 * nouvel onglet).
 */
export function hasPreviousHistoryEntry(
  state: HistoryStateWithIndex | null | undefined | unknown
): boolean {
  if (typeof state !== 'object' || state === null) return false;
  const idx = (state as HistoryStateWithIndex).idx;
  return typeof idx === 'number' && idx > 0;
}
