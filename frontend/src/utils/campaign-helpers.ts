/**
 * Utilitaires et libellés partagés pour les campagnes
 */

export function getRythmeLabel(rythme?: number | null, _long: boolean = false): string | null {
  switch (rythme) {
    case 0:
      return '1 post par mois';
    case 1:
      return '1 post par semaine';
    case 2:
      return '1 post pour 3 jours';
    case 3:
      return '1 post par jour';
    case 4:
      return 'Plusieurs posts par jour';
    default:
      return null;
  }
}

export function getRpLabel(rp?: number | null, long: boolean = false): string | null {
  switch (rp) {
    case 0:
      return long
        ? "Roman de gare (Peu d'exigence en terme de Roleplay)"
        : 'Roman de gare';
    case 1:
      return long
        ? 'Standard (Exigence standard : action décrite correctement, quelques pensées, ...)'
        : 'Standard';
    case 2:
      return long
        ? 'Théâtre (Exigence forte : la description prime, il faudra faire des efforts.)'
        : 'Théâtre';
    case 3:
      return long
        ? 'Cyrano (De haut vol : le roleplay est au centre même de la partie !)'
        : 'Cyrano';
    default:
      return null;
  }
}

export function getStatutLabel(statut?: number | null): string {
  switch (statut) {
    case 3:
      return 'En préparation';
    case 0:
      return 'Ouverte';
    case 1:
      return 'En pause';
    case 2:
      return 'Archivé';
    default:
      return 'Ouverte';
  }
}

/**
 * Calcule la priorité de tri d'une campagne pour la page "Mes campagnes" :
 * 1. Les campagnes en alerte
 * 2. Les campagnes avec des messages non lus
 * 3. Les campagnes "en cours" (statut = 0 ou non défini)
 * 4. Les campagnes autres (en préparation statut = 3, en pause statut = 1, archivée statut = 2)
 */
export function getCampaignSortPriority(campaign: {
  hasAlert?: boolean;
  hasUnread?: boolean;
  statut?: number | null;
}): number {
  if (campaign.hasAlert) return 1;
  if (campaign.hasUnread) return 2;
  if (campaign.statut === 0 || campaign.statut === undefined || campaign.statut === null) return 3;
  return 4;
}

/**
 * Compare deux campagnes pour le tri dans "Mes campagnes" selon les critères :
 * 1. Priorité (alerte > messages non lus > en cours > autres)
 * 2. Ordre alphabétique (nom de la campagne)
 */
export function compareCampaignsForMyCampaigns<T extends { name: string; hasAlert?: boolean; hasUnread?: boolean; statut?: number | null; id?: number }>(
  a: T,
  b: T
): number {
  const priorityA = getCampaignSortPriority(a);
  const priorityB = getCampaignSortPriority(b);

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  const nameComparison = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  if (nameComparison !== 0) {
    return nameComparison;
  }

  const exactNameComparison = a.name.localeCompare(b.name);
  if (exactNameComparison !== 0) {
    return exactNameComparison;
  }

  return (b.id ?? 0) - (a.id ?? 0);
}
