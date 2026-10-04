import { SourceEspace, SourceSection, SourceGroupe, SourceTheme } from '../types.js';
import { buildSectionTitle, buildTopicTitle } from './espritjdr.mapper.js';

export interface SectionPlan {
  /** Clé stable utilisée dans la table de correspondance espritjdr_migration. */
  key: string;
  espaceId: number | null;
  sectionId: number | null;
  groupeId: number;
  title: string;
  ordre: number;
}

export interface TopicPlan {
  key: string;
  themeId: number;
  sectionKey: string;
  title: string;
  isClosed: boolean;
  ordre: number;
}

function compareByOrdreId(a: { ordre: number; id: number }, b: { ordre: number; id: number }): number {
  if (a.ordre !== b.ordre) {
    return a.ordre - b.ordre;
  }
  return a.id - b.id;
}

function sectionKey(
  espaceId: number | null,
  sectionId: number | null,
  groupeId: number
): string {
  if (espaceId === null) {
    return `sans-espace:groupe:${groupeId}`;
  }
  return sectionId === null
    ? `espace:${espaceId}:groupe:${groupeId}`
    : `espace:${espaceId}:section:${sectionId}:groupe:${groupeId}`;
}

/**
 * Construit le plan des sections jdroll à partir de l'arborescence espritjdr.
 * jdroll n'a qu'un seul niveau de section : un triplet (espace, intercalaire,
 * groupe) devient une section dont le libellé joint les trois niveaux avec
 * " > ". Seuls les groupes portant des thèmes produisent une section.
 */
export function buildSectionPlans(
  espaces: SourceEspace[],
  sections: SourceSection[],
  groupes: SourceGroupe[],
  themes: SourceTheme[]
): SectionPlan[] {
  const sectionsByEspace = new Map<number, SourceSection[]>();
  for (const section of sections) {
    const list = sectionsByEspace.get(section.espaceId) ?? [];
    list.push(section);
    sectionsByEspace.set(section.espaceId, list);
  }

  // Groupes portant au moins un thème
  const groupesWithThemes = new Set<number>();
  for (const theme of themes) {
    groupesWithThemes.add(theme.groupeId);
  }

  const plans: SectionPlan[] = [];
  const sortedEspaces = [...espaces].sort(compareByOrdreId);

  const pushGroupe = (espaceId: number | null, sectionId: number | null, groupe: SourceGroupe, espaceLibelle: string, sectionLibelle: string | null) => {
    if (!groupesWithThemes.has(groupe.id)) {
      return;
    }
    plans.push({
      key: sectionKey(espaceId, sectionId, groupe.id),
      espaceId,
      sectionId,
      groupeId: groupe.id,
      title: buildSectionTitle(espaceLibelle, sectionLibelle, groupe.titre),
      ordre: 0,
    });
  };

  for (const espace of sortedEspaces) {
    // Groupes posés directement sur l'espace (sans intercalaire)
    const directGroupes = groupes
      .filter((g) => g.espaceId === espace.id && g.sectionId === null)
      .sort(compareByOrdreId);
    for (const groupe of directGroupes) {
      pushGroupe(espace.id, null, groupe, espace.libelle, null);
    }

    const espaceSections = [...(sectionsByEspace.get(espace.id) ?? [])].sort(compareByOrdreId);
    for (const section of espaceSections) {
      const sectionGroupes = groupes
        .filter((g) => g.espaceId === espace.id && g.sectionId === section.id)
        .sort(compareByOrdreId);
      for (const groupe of sectionGroupes) {
        pushGroupe(espace.id, section.id, groupe, espace.libelle, section.libelle);
      }
    }
  }

  // Groupes orphelins (sans espace) regroupés dans des sections dédiées en fin
  const orphanGroupes = groupes
    .filter((g) => g.espaceId === null)
    .sort(compareByOrdreId);
  for (const groupe of orphanGroupes) {
    pushGroupe(null, null, groupe, 'Sans espace', null);
  }

  return plans.map((plan, index) => ({ ...plan, ordre: index + 1 }));
}

/**
 * Construit le plan des topics jdroll : un thème_groupe devient un topic dont
 * le titre est le libellé du thème seul. L'ordre est séquentiel au sein de
 * chaque section (une section = un groupe).
 */
export function buildTopicPlans(
  sectionPlans: SectionPlan[],
  groupes: SourceGroupe[],
  themes: SourceTheme[]
): TopicPlan[] {
  const plan: TopicPlan[] = [];
  const groupesById = new Map<number, SourceGroupe>();
  for (const groupe of groupes) {
    groupesById.set(groupe.id, groupe);
  }

  for (const section of sectionPlans) {
    const groupe = groupesById.get(section.groupeId);
    if (!groupe) {
      continue;
    }

    let ordre = 0;
    const groupeThemes = themes
      .filter((t) => t.groupeId === groupe.id)
      .sort(compareByOrdreId);

    for (const theme of groupeThemes) {
      ordre += 1;
      plan.push({
        key: `theme:${theme.id}`,
        themeId: theme.id,
        sectionKey: section.key,
        title: buildTopicTitle(theme.titre),
        isClosed: groupe.statutGroupeId !== 1,
        ordre,
      });
    }
  }

  return plan;
}
