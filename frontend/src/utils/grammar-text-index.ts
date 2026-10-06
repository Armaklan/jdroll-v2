/**
 * Extraction du texte brut d'un contenu éditable (contentEditable) et mapping
 * des offsets de ce texte vers les nœuds texte du DOM.
 *
 * Utilisé par le correcteur grammatical : LanguageTool travaille sur du texte
 * brut avec des offsets, le surlignage doit retomber sur les bons nœuds du
 * contentEditable (texte réparti sur plusieurs spans, blocs, images, ...).
 *
 * Contrat volontairement découplé du DOM réel (nodeType / data / tagName /
 * childNodes) pour rester testable sans navigateur.
 */

export interface GrammarDomNode {
  nodeType: number;
  data?: string;
  tagName?: string;
  childNodes?: ArrayLike<GrammarDomNode> & Iterable<GrammarDomNode>;
}

/** Nœud texte identifié dans le texte extrait */
export interface GrammarDomTextNode {
  nodeType: number;
  data?: string;
}

export interface TextIndexSegment {
  /** Nœud texte du DOM éditable */
  node: GrammarDomTextNode;
  /** Offset de début (inclus) dans le texte extrait */
  start: number;
  /** Offset de fin (exclu) dans le texte extrait */
  end: number;
}

export interface GrammarTextIndex {
  /** Texte brut extrait, avec '\n' comme séparateurs de blocs */
  text: string;
  /** Segments de texte dans l'ordre du document */
  segments: TextIndexSegment[];
}

/** Blocs qui produisent un saut de ligne après leur contenu */
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'li',
  'tr',
  'td',
  'th',
  'pre',
  'hr',
]);

const BR_TAG = 'br';
const IMG_TAG = 'img';

function isBlockTag(node: GrammarDomNode): boolean {
  return BLOCK_TAGS.has((node.tagName ?? '').toLowerCase());
}

/**
 * Construit l'index texte du sous-arbre :
 * - les nœuds texte sont enregistrés comme segments contigus ;
 * - les blocs (p, li, ...) et <br> insèrent un '\n' après leur contenu ;
 * - les images sont ignorées (aucune contribution au texte).
 */
export function buildTextIndex(root: GrammarDomNode): GrammarTextIndex {
  let text = '';
  const segments: TextIndexSegment[] = [];

  const append = (raw: string) => {
    text += raw;
  };

  const walk = (node: GrammarDomNode) => {
    if (node.nodeType === 3) {
      const data = node.data ?? '';
      if (data.length > 0) {
        segments.push({ node, start: text.length, end: text.length + data.length });
        append(data);
      }
      return;
    }
    if (node.nodeType !== 1) {
      return;
    }
    const tag = (node.tagName ?? '').toLowerCase();
    if (tag === IMG_TAG) {
      return;
    }
    if (tag === BR_TAG) {
      if (text.length > 0) {
        append('\n');
      }
      return;
    }
    // Séparateur de bloc : saut de ligne avant le bloc (jamais en fin de texte)
    if (isBlockTag(node) && text.length > 0) {
      append('\n');
    }
    const children = node.childNodes ?? [];
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
  };

  walk(root);

  return { text, segments };
}

export interface GrammarMatchDomRange {
  startNode: GrammarDomTextNode;
  startOffset: number;
  endNode: GrammarDomTextNode;
  endOffset: number;
}

/** Segment contenant l'offset (start <= offset < end) */
function findSegment(index: GrammarTextIndex, offset: number): TextIndexSegment | null {
  for (const segment of index.segments) {
    if (offset >= segment.start && offset < segment.end) {
      return segment;
    }
  }
  return null;
}

/** Dernier segment touché par l'intervalle [offset, offset + length) */
function findEndSegment(index: GrammarTextIndex, endOffset: number): TextIndexSegment | null {
  let result: TextIndexSegment | null = null;
  for (const segment of index.segments) {
    if (segment.start < endOffset) {
      result = segment;
    }
  }
  return result;
}

/**
 * Traduit un match (offset, longueur) du texte extrait en bornes DOM
 * (nœud texte + offset local) prêtes à être insérées dans un Range.
 *
 * Retourne null quand le match ne peut pas être représenté : début sur un
 * séparateur '\n', match vide ou débordant en fin de texte.
 */
export function resolveMatchRange(
  index: GrammarTextIndex,
  offset: number,
  length: number
): GrammarMatchDomRange | null {
  if (length <= 0) {
    return null;
  }

  const startSegment = findSegment(index, offset);
  if (!startSegment) {
    return null;
  }

  const endOffset = offset + length;
  const endSegment = findEndSegment(index, endOffset);
  if (!endSegment || endSegment.start < startSegment.start) {
    return null;
  }

  return {
    startNode: startSegment.node,
    startOffset: offset - startSegment.start,
    endNode: endSegment.node,
    endOffset: Math.min(endOffset - endSegment.start, endSegment.end - endSegment.start),
  };
}
