/**
 * Renvoie les classes CSS pour le pseudonyme en fonction du profil utilisateur :
 * - profil = 2 : Administrateur -> text-red-600 font-semibold
 * - profil = 1 : Membre d'honneur -> text-purple-600 font-semibold
 * - profil = 0 ou autre : Joueur standard -> defaultClass
 */
export function getUserColorClass(profil?: number | null, defaultClass: string = ''): string {
  const p = Number(profil);
  if (p === 2) {
    return 'text-red-600 font-semibold';
  }
  if (p === 1) {
    return 'text-purple-600 font-semibold';
  }
  return defaultClass;
}

/**
 * Renvoie la couleur hexadécimale (ou null si standard) pour les styles inline
 */
export function getUserProfileColor(profil?: number | null): string | null {
  const p = Number(profil);
  if (p === 2) {
    return '#dc2626'; // Rouge Tailwind red-600
  }
  if (p === 1) {
    return '#9333ea'; // Violet Tailwind purple-600
  }
  return null;
}

/**
 * Indique si un utilisateur ou un profil correspond à un Administrateur (profil === 2)
 */
export function isUserAdmin(userOrProfil?: number | null | { profil?: number | null }): boolean {
  if (userOrProfil && typeof userOrProfil === 'object') {
    return Number(userOrProfil.profil) === 2;
  }
  return Number(userOrProfil) === 2;
}

/**
 * Indique si un utilisateur ou un profil correspond à un Membre d'honneur (profil === 1)
 */
export function isUserHonored(userOrProfil?: number | null | { profil?: number | null }): boolean {
  if (userOrProfil && typeof userOrProfil === 'object') {
    return Number(userOrProfil.profil) === 1;
  }
  return Number(userOrProfil) === 1;
}
