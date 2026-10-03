import { SourceCampaign, NewCampaignData } from '../types.js';
import { decodeHtmlEntities } from '../utils/html-entities.js';

export { decodeHtmlEntities };

/**
 * Statuts espritjdr (statut_campagne) :
 * 1 = En préparation, 2 = Ouverte, 3 = Fermée, 4 = Bloquée, 5 = En pause.
 * Statuts jdroll (campagne.statut) :
 * 0 = active, 1 = en pause, 2 = archivée, 3 = en préparation.
 */
export function mapCampaignStatut(statutCampagneId: number): number {
  switch (statutCampagneId) {
    case 1:
      return 3;
    case 2:
      return 0;
    case 3:
    case 4:
      return 2;
    case 5:
      return 1;
    default:
      return 0;
  }
}

export function buildSectionTitle(espaceLibelle: string, sectionLibelle: string | null): string {
  const espace = decodeHtmlEntities(espaceLibelle);
  if (!sectionLibelle) {
    return espace;
  }
  return `${espace} > ${decodeHtmlEntities(sectionLibelle)}`;
}

export function buildTopicTitle(groupeTitre: string, themeTitre: string): string {
  return `${decodeHtmlEntities(groupeTitre)} > ${decodeHtmlEntities(themeTitre)}`;
}

export function mapCampaign(source: SourceCampaign, mjId: number): NewCampaignData {
  const rawName = decodeHtmlEntities(source.nom || '');
  const name = rawName.length > 100 ? rawName.slice(0, 100) : rawName;
  const nbJoueurs = Math.min(50, Math.max(1, Number(source.nbMaxJoueur) || 1));

  return {
    mjId,
    name,
    systeme: decodeHtmlEntities(source.jeuNom || ''),
    univers: '',
    description: source.annonce ?? '',
    nbJoueurs,
    statut: mapCampaignStatut(source.statutCampagneId),
    isRecrutementOpen: Boolean(source.inscriptionPJ),
  };
}
