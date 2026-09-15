/**
 * Utilitaires et libellés partagés pour les campagnes
 */

export function getRythmeLabel(rythme?: number | null, _long: boolean = false): string | null {
  switch (rythme) {
    case 1:
      return '1 post par mois';
    case 2:
      return '1 post par semaine';
    case 3:
      return '1 post pour 3 jours';
    case 4:
      return '1 post par jour';
    case 5:
      return 'Plusieurs posts par jour';
    default:
      return null;
  }
}

export function getRpLabel(rp?: number | null, long: boolean = false): string | null {
  switch (rp) {
    case 1:
      return long
        ? "Roman de gare (Peu d'exigence en terme de Roleplay)"
        : 'Roman de gare';
    case 2:
      return long
        ? 'Standard (Exigence standard : action décrite correctement, quelques pensées, ...)'
        : 'Standard';
    case 3:
      return long
        ? 'Théâtre (Exigence forte : la description prime, il faudra faire des efforts.)'
        : 'Théâtre';
    case 4:
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
