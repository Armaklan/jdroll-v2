/**
 * Nettoyage complet du formatage d'un contenu HTML de l'éditeur WYSIWYG.
 *
 * Contrairement à document.execCommand('removeFormat'), qui ne retire que le
 * gras/italique inline, cette fonction retire également :
 * - les spans de styles RP de l'éditeur (dialogue, pensee, rp1, rp2, hrp) ;
 * - les styles inline et classes CSS issus d'un copier-coller externe
 *   (ex: <span style="color: red">, <p class="MsoNormal">) ;
 * - les balises de mise en forme inline (<b>, <font>, <u>, etc.).
 *
 * La structure de bloc (titres, paragraphes, listes, citations, tableaux),
 * les liens, les images et les balises BBCode sont conservés.
 */

// Éléments dont on conserve les attributs (dimension des images, style des tableaux wysiwyg)
const PRESERVED_ATTRIBUTE_TAGS = ['img', 'table'];

// Balises purement inline qui sont déroulées (contenu conservé, balise retirée)
const UNWRAPPABLE_INLINE_TAGS =
  'b|strong|i|em|u|ins|s|strike|del|mark|small|big|font|tt|sub|sup|span';

export function cleanFormatting(html: string): string {
  if (!html) return html;

  // 1. Retire les attributs style/class de tous les éléments,
  //    sauf ceux dont les attributs sont structurels (img, table).
  let result = html.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (match: string, tag: string, attrs: string) => {
      if (PRESERVED_ATTRIBUTE_TAGS.includes(tag.toLowerCase())) {
        return match;
      }
      const cleanedAttrs = attrs.replace(
        /\s+(?:style|class)\s*=\s*(?:"[^"]*"|'[^']*')/gi,
        ''
      );
      return `<${tag}${cleanedAttrs}>`;
    }
  );

  // 2. Déroule les balises de mise en forme inline (ouvrantes et fermantes).
  result = result.replace(new RegExp(`</?(?:${UNWRAPPABLE_INLINE_TAGS})\\b[^>]*>`, 'gi'), '');

  return result;
}
