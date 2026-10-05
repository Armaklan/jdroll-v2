/**
 * Construction des balises BBCode avancées ([hide], [private]) en conservant
 * le formatage HTML de la sélection faite dans l'éditeur WYSIWYG.
 *
 * Historiquement, la sélection était convertie en texte brut (Selection.toString)
 * puis réinsérée comme simple nœud texte : le formatage (gras, code, styles RP)
 * était perdu. Ces fonctions réutilisent le HTML de la sélection tant que
 * l'utilisateur ne modifie pas le contenu dans la modale.
 */

/**
 * Échappe les caractères HTML spéciaux.
 */
function escapeHtml(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Déroule le paragraphe unique englobant le HTML d'une sélection.
 *
 * Depuis que l'éditeur encapsule le texte dans des <p>, le HTML capturé
 * d'une sélection d'un seul paragraphe contient ce <p> englobant. On le
 * retire pour que la balise BBCode ([hide], [private]) encapsule un contenu
 * inline et reste groupée dans un seul paragraphe à l'insertion.
 * Les sélections multi-paragraphes sont conservées telles quelles.
 */
function unwrapSingleParagraph(html: string): string {
  const match = html.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
  if (match && !/<p[\s>]/i.test(match[1])) {
    return match[1];
  }
  return html;
}

/**
 * Détermine le HTML à encapsuler dans la balise.
 *
 * - Si le contenu de la modale est inchangé par rapport au texte sélectionné
 *   et qu'un HTML formaté a été capturé, ce HTML est réutilisé tel quel
 *   (le formatage de la sélection est conservé).
 * - Sinon (contenu modifié ou saisi à la main), le contenu est renvoyé
 *   échappé en texte brut, comme avant.
 */
export function resolveTagInnerHtml(
  selectedText: string,
  selectedHtml: string,
  editedContent: string
): string {
  if (
    selectedHtml &&
    editedContent === selectedText &&
    editedContent.length > 0
  ) {
    return unwrapSingleParagraph(selectedHtml);
  }
  return escapeHtml(editedContent);
}

/**
 * Assemble la balise complète en HTML : les balises ouvrante/fermante
 * (dont le paramètre peut contenir du texte saisi) sont échappées, le
 * contenu interne est inséré intact (c'est du HTML).
 */
export function buildAdvancedTagHtml(
  openTag: string,
  innerHtml: string,
  closeTag: string
): string {
  return `${escapeHtml(openTag)}${innerHtml}${escapeHtml(closeTag)}`;
}
