import { SourceEspace, SourceSection, SourceGroupe, SourceTheme } from '../types.js';
import { buildSectionTitle, buildTopicTitle } from './espritjdr.mapper.js';

export interface SectionPlan {
  /** Clé stable utilisée dans la table de correspondance espritjdr_migration. */
  key: string;
  espaceId: number | null;
  sectionId: number | null;
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

function sectionKey(espaceId: number | null, sectionId: number | null): string {
  if (espaceId === null) {
    return 'sans-espace';
  }
  return sectionId === null ? `espace:${espaceId}` : `espace:${espaceId}:section:${sectionId}`;
}

/**
 * Construit le plan des sections jdroll à partir de l'arborescence espritjdr.
 * jdroll n'a qu'un seul niveau de section : un couple (espace, intercalaire)
 * devient une section dont le libellé joint les deux niveaux avec " > ".
 * Seuls les espaces/intercalaires portant des groupes produisent une section.
 */
export function buildSectionPlans(
  espaces: SourceEspace[],
  sections: SourceSection[],
  groupes: SourceGroupe[]
): SectionPlan[] {
  const sectionsByEspace = new Map<number, SourceSection[]>();
  for (const section of sections) {
    const list = sectionsByEspace.get(section.espaceId) ?? [];
    list.push(section);
    sectionsByEspace.set(section.espaceId, list);
  }

  // (espaceId, sectionId) -> true dès qu'un groupe y est rattaché
  const occupied = new Set<string>();
  for (const groupe of groupes) {
    occupied.add(sectionKey(groupe.espaceId, groupe.sectionId));
  }

  const plans: SectionPlan[] = [];
  const sortedEspaces = [...espaces].sort(compareByOrdreId);

  for (const espace of sortedEspaces) {
    const espaceSections = [...(sectionsByEspace.get(espace.id) ?? [])].sort(compareByOrdreId);
    // Groupes posés directement sur l'espace (sans intercalaire)
    if (occupied.has(sectionKey(espace.id, null))) {
      plans.push({
        key: sectionKey(espace.id, null),
        espaceId: espace.id,
        sectionId: null,
        title: buildSectionTitle(espace.libelle, null),
        ordre: 0,
      });
    }
    for (const section of espaceSections) {
      const key = sectionKey(espace.id, section.id);
      if (occupied.has(key)) {
        plans.push({
          key,
          espaceId: espace.id,
          sectionId: section.id,
          title: buildSectionTitle(espace.libelle, section.libelle),
          ordre: 0,
        });
      }
    }
  }

  // Groupes orphelins (sans espace) regroupés dans une section dédiée
  if (occupied.has(sectionKey(null, null))) {
    plans.push({
      key: sectionKey(null, null),
      espaceId: null,
      sectionId: null,
      title: 'Sans espace',
      ordre: 0,
    });
  }

  return plans.map((plan, index) => ({ ...plan, ordre: index + 1 }));
}

/**
 * Construit le plan des topics jdroll : un couple (groupe_campagne,
 * theme_groupe) devient un topic dont le titre joint les deux libellés
 * avec " > ". L'ordre est séquentiel au sein de chaque section.
 */
export function buildTopicPlans(
  sectionPlans: SectionPlan[],
  groupes: SourceGroupe[],
  themes: SourceTheme[]
): TopicPlan[] {
  const plan: TopicPlan[] = [];

  for (const section of sectionPlans) {
    const sectionGroupes = groupes
      .filter((g) => sectionKey(g.espaceId, g.sectionId) === section.key)
      .sort(compareByOrdreId);

    let ordre = 0;
    for (const groupe of sectionGroupes) {
      const groupeThemes = themes
        .filter((t) => t.groupeId === groupe.id)
        .sort(compareByOrdreId);

      for (const theme of groupeThemes) {
        ordre += 1;
        plan.push({
          key: `theme:${theme.id}`,
          themeId: theme.id,
          sectionKey: section.key,
          title: buildTopicTitle(groupe.titre, theme.titre),
          isClosed: groupe.statutGroupeId !== 1,
          ordre,
        });
      }
    }
  }

  return plan;
}
