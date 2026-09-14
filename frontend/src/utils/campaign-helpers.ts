/**
 * Utilitaires et libellés partagés pour les campagnes
 */

export function getRythmeLabel(rythme?: number | null, long: boolean = false): string | null {
  switch (rythme) {
    case 1:
      return long ? 'Rapide (1+ message par jour)' : 'Rapide (1+ msg/jour)';
    case 2:
      return long ? 'Moyen (plusieurs messages par semaine)' : 'Moyen (plusieurs msg/semaine)';
    case 3:
      return long ? 'Posé (1 message par semaine)' : 'Posé (1 msg/semaine)';
    case 4:
      return long ? 'Lent / À son rythme' : 'Lent / À son rythme';
    default:
      return long ? 'Standard' : null;
  }
}

export function getRpLabel(rp?: number | null, long: boolean = false): string | null {
  switch (rp) {
    case 1:
      return long ? 'Narratif & Littéraire (textes longs, immersifs)' : 'RP Narratif / Littéraire';
    case 2:
      return long ? 'Semi-Développé (paragraphes modérés)' : 'RP Semi-Développé';
    case 3:
      return long ? 'Direct & Court (actions rapides)' : 'RP Direct / Court';
    default:
      return long ? 'Libre' : null;
  }
}
