import { CharacterSummary } from '../types/campaign';

/**
 * Regroupement et filtrage des personnages du sélecteur « Poster en tant que ».
 * PNJ = personnage sans utilisateur propriétaire (userId null),
 * PJ = personnage rattaché à un utilisateur.
 */

export interface PostAuthorGroups {
  /** Personnages non-joueurs, affichés en premier. */
  pnj: CharacterSummary[];
  /** Personnages joueurs, affichés après les PNJ. */
  pj: CharacterSummary[];
}

/** Normalise une chaîne pour une recherche insensible à la casse et aux accents. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Indique si un personnage correspond à la requête (nom ou concept). */
export function matchesPostAuthorQuery(character: CharacterSummary, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return (
    normalize(character.name).includes(q) ||
    normalize(character.concept ?? '').includes(q)
  );
}

/**
 * Sépare les personnages en PNJ / PJ (PNJ en premier) et filtre par requête.
 * Chaque groupe est trié alphabétiquement par nom.
 */
export function groupAndFilterPostAuthors(
  characters: CharacterSummary[],
  query: string
): PostAuthorGroups {
  const byName = (a: CharacterSummary, b: CharacterSummary) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

  const pnj: CharacterSummary[] = [];
  const pj: CharacterSummary[] = [];

  for (const character of characters) {
    if (!matchesPostAuthorQuery(character, query)) continue;
    if (character.userId === null || character.userId === undefined) {
      pnj.push(character);
    } else {
      pj.push(character);
    }
  }

  pnj.sort(byName);
  pj.sort(byName);

  return { pnj, pj };
}
