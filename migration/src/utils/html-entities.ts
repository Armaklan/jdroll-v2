const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  ouml: 'ö',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Auml: 'Ä',
  Ccedil: 'Ç',
  Igrave: 'Ì',
  Icirc: 'Î',
  Ograve: 'Ò',
  Ocirc: 'Ô',
  Ugrave: 'Ù',
  Ucirc: 'Û',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  mdash: '—',
  ndash: '–',
  deg: '°',
  euro: '€',
  copy: '©',
  trade: '™',
};

/**
 * Décode les entités HTML (nommées et numériques) présentes dans les
 * libellés de la base espritjdr (ex : "R&egrave;gles" -> "Règles").
 */
export function decodeHtmlEntities(text: string): string {
  const trimmed = text.trim();
  return trimmed
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const code = parseInt(body.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (body.startsWith('#')) {
        const code = parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return NAMED_ENTITIES[body] ?? match;
    })
    .trim();
}
