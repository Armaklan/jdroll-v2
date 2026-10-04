import { decodeHtmlEntities } from '../utils/html-entities.js';

/**
 * Fiche du générateur espritjdr (table `generateur_fiche`, colonne
 * `contenu_xml`) convertie en fiche codée jdroll (campagne_config).
 */

/** Champ de la fiche codée jdroll (template_fields). */
export interface SheetFieldPlan {
  /** Identifiant du champ espritjdr (attribut id de l'élément XML). */
  sourceId: string;
  type: 'text' | 'textarea';
  top: number;
  left: number;
  width: number;
  height: number;
  defaultValue: string;
}

/** Résultat de la conversion d'une fiche espritjdr en fiche codée jdroll. */
export interface SheetTemplatePlan {
  /** Image de fond de la fiche (campagne_config.template_img). */
  backgroundImage: string | null;
  width: number | null;
  height: number | null;
  /** Couleur du texte des champs (campagne_config.text_color). */
  textColor: string | null;
  fields: SheetFieldPlan[];
  /**
   * Fonctionnalités espritjdr sans équivalent fiche codée jdroll,
   * avec leur nombre d'occurrences (voir migration/FONCTIONNALITES_NON_MIGREES.md).
   */
  unsupported: Record<string, number>;
}

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

const TAG_RE = /<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTR_RE = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: '#document', attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(xml)) !== null) {
    if (match[0].startsWith('<?')) {
      continue;
    }
    const [, closing, tag, rawAttrs] = match;
    if (closing) {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    const selfClosing = /\/\s*$/.test(rawAttrs);
    ATTR_RE.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = ATTR_RE.exec(rawAttrs)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? '';
    }
    const node: XmlNode = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) {
      stack.push(node);
    }
  }
  return root;
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function countUnsupported(unsupported: Record<string, number>, key: string): void {
  unsupported[key] = (unsupported[key] ?? 0) + 1;
}

function buildField(
  node: XmlNode,
  type: 'text' | 'textarea',
  top: number,
  left: number
): SheetFieldPlan {
  const width = toNumber(node.attrs['largeur']) ?? 150;
  const height = toNumber(node.attrs['hauteur']) ?? 32;
  return {
    sourceId: node.attrs['id'] ?? '',
    type,
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(width),
    height: Math.round(height),
    defaultValue: decodeHtmlEntities(node.attrs['valeur'] ?? ''),
  };
}

function walk(
  node: XmlNode,
  top: number,
  left: number,
  fields: SheetFieldPlan[],
  unsupported: Record<string, number>
): void {
  for (const child of node.children) {
    const attrs = child.attrs;
    const childTop = top + (toNumber(attrs['position_haut']) ?? 0);
    const childLeft = left + (toNumber(attrs['position_gauche']) ?? 0);

    switch (child.tag) {
      case 'section':
      case 'section_absolu':
        if (attrs['onglet'] || attrs['titre_onglet']) {
          countUnsupported(unsupported, 'onglet');
        }
        if (attrs['image']) {
          countUnsupported(unsupported, 'section_image');
        }
        walk(child, childTop, childLeft, fields, unsupported);
        break;
      case 'balise_jet':
        countUnsupported(unsupported, 'balise_jet');
        walk(child, top, left, fields, unsupported);
        break;
      case 'text':
      case 'total':
        fields.push(buildField(child, 'text', childTop, childLeft));
        break;
      case 'area':
        fields.push(buildField(child, 'textarea', childTop, childLeft));
        break;
      case 'titre':
        countUnsupported(unsupported, 'titre_label');
        fields.push({
          ...buildField(child, 'text', childTop, childLeft),
          defaultValue: decodeHtmlEntities(attrs['titre'] ?? ''),
        });
        break;
      case 'image':
        countUnsupported(unsupported, 'image');
        break;
      case 'groupe_check':
        countUnsupported(unsupported, 'groupe_check');
        break;
      case 'groupe_radio':
        countUnsupported(unsupported, 'groupe_radio');
        break;
      case 'system_jet':
        countUnsupported(unsupported, 'system_jet');
        break;
      case 'jet_des':
        countUnsupported(unsupported, 'jet_des');
        break;
      case 'titre_fiche':
        countUnsupported(unsupported, 'titre_fiche');
        break;
      default:
        break;
    }
  }
}

/**
 * Convertit le contenu XML d'une fiche du générateur espritjdr en plan de
 * fiche codée jdroll. Les éléments `text`/`total` deviennent des champs texte,
 * `area` des zones de texte, `titre` des champs texte portant le libellé
 * (jdroll n'a pas de label statique). Les positions sont absolues par rapport
 * à la fiche (les offsets de sections imbriquées s'additionnent).
 */
export function mapFicheToSheetTemplate(contenuXml: string): SheetTemplatePlan {
  const root = parseXml(contenuXml);
  const fiche = root.children.find((child) => child.tag === 'fiche') ?? root;

  const fields: SheetFieldPlan[] = [];
  const unsupported: Record<string, number> = {};
  walk(fiche, 0, 0, fields, unsupported);

  const textColor = fiche.attrs['txtcouleur']?.trim() ?? '';

  return {
    backgroundImage: fiche.attrs['image']?.trim() || null,
    width: toNumber(fiche.attrs['largeur']),
    height: toNumber(fiche.attrs['hauteur']),
    textColor: textColor !== '' && textColor !== 'transparent' ? textColor : null,
    fields,
    unsupported,
  };
}

function escapeFieldValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sérialise les champs en HTML "fiche codée" jdroll, au format de
 * campagne_config.template_fields (compatible parseTemplateFields du frontend,
 * cf. frontend/src/utils/character-sheet.ts).
 */
export function serializeSheetFields(fields: SheetFieldPlan[]): string {
  let html = `<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="${fields.length}"></div>`;

  fields.forEach((field, index) => {
    const controlId = index + 1;
    const linkId = `JDRollUserControlLink${controlId}_child`;
    const isTextarea = field.type === 'textarea';
    const isEmpty = field.defaultValue.trim() === '';
    const displayValue = isEmpty ? 'Empty' : escapeFieldValue(field.defaultValue);
    const emptyClass = isEmpty ? ' editable-empty' : '';
    const preWrapClass = isTextarea ? ' editable-pre-wrapped' : '';
    const typeAttr = isTextarea ? 'textarea' : 'text';

    html += `<div class="ui-draggable ui-draggable-handle JDRollDroppedUserControl ui-resizable" id="JDRollUserControl_${controlId}" style="position: absolute; top: ${field.top}px; left: ${field.left}px; width: ${field.width}px; right: auto; height: ${field.height}px; bottom: auto;"><a id="${linkId}" data-type="${typeAttr}" data-pk="1" class="editable${preWrapClass} editable-click editable-unsaved${emptyClass}" data-original-title="" title="" style="background-color: rgba(0, 0, 0, 0);">${displayValue}</a><div class="ui-resizable-handle ui-resizable-e" style="z-index: 90; display: block;"></div><div class="ui-resizable-handle ui-resizable-s" style="z-index: 90; display: block;"></div><div class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se" style="z-index: 90; display: block;"></div></div>`;
  });

  return html;
}
