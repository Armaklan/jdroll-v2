import { SourceHjPost } from '../types.js';
import { decodeHtmlEntities } from './espritjdr.mapper.js';

/**
 * Construit le bloc BBCode jdroll d'un HJ espritjdr (hj_post) : le contenu du
 * HJ et ses réponses (hj_post_reponse), attribuées à leur auteur, enveloppés
 * dans une balise [private=...] ciblant le nom de l'intervenant auteur du HJ.
 */
export function buildHjPrivateBlock(hjPost: SourceHjPost): string {
  const target = decodeHtmlEntities(hjPost.intervenantFromNom || '');
  const lines = [
    `[private=${target}]`,
    hjPost.contenu,
    ...hjPost.reponses.map(
      (reponse) => `<p><strong>${decodeHtmlEntities(reponse.intervenantNom || '')} :</strong> ${reponse.contenu}</p>`
    ),
    '[/private]',
  ];
  return lines.join('\n');
}
