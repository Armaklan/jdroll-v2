export type TemplateFieldType = 'text' | 'textarea' | 'JDRollEditableSelect';

export interface TemplateField {
  id: number;
  linkId: string;
  type: TemplateFieldType;
  top: number;
  left: number;
  width: number;
  height: number;
  defaultValue: string;
  options: string[];
}

/**
 * Parses the HTML string stored in `campagne_config.template_fields`
 * into an array of structured `TemplateField` objects.
 */
export function parseTemplateFields(html?: string | null): { maxCount: number; fields: TemplateField[] } {
  if (!html || !html.trim()) {
    return { maxCount: 0, fields: [] };
  }

  // Extract max index from hiddenFieldsCount
  const countMatch = html.match(/id=["']hiddenFieldsCount["']\s+value=["'](\d+)["']/i);
  let maxCount = countMatch ? parseInt(countMatch[1], 10) : 0;

  const controlRegex = /<div\s+[^>]*id=["']JDRollUserControl_(\d+)["'][^>]*>([\s\S]*?)<\/div>(?=(?:<div\s+[^>]*id=["']JDRollUserControl_|$))/gi;
  const fields: TemplateField[] = [];

  let match: RegExpExecArray | null;
  while ((match = controlRegex.exec(html)) !== null) {
    const controlIdNum = parseInt(match[1], 10);
    if (controlIdNum === 0) continue; // Root counter block

    const fullDiv = match[0];
    const innerContent = match[2];

    // Extract styles: top, left, width, height
    const styleMatch = fullDiv.match(/style=["']([^"']*)["']/i);
    const styleStr = styleMatch ? styleMatch[1] : '';

    const topMatch = styleStr.match(/top:\s*([-\d.]+)px/i);
    const leftMatch = styleStr.match(/left:\s*([-\d.]+)px/i);
    const widthMatch = styleStr.match(/width:\s*([-\d.]+)px/i);
    const heightMatch = styleStr.match(/height:\s*([-\d.]+)px/i);

    const top = topMatch ? Math.max(0, parseFloat(topMatch[1])) : 0;
    const left = leftMatch ? Math.max(0, parseFloat(leftMatch[1])) : 0;
    const width = widthMatch ? Math.max(20, parseFloat(widthMatch[1])) : 150;
    const height = heightMatch ? Math.max(20, parseFloat(heightMatch[1])) : 32;

    // Extract link tag (<a>)
    const linkMatch = innerContent.match(/<a\s+[^>]*id=["'](JDRollUserControlLink\d+_child)["'][^>]*>([\s\S]*?)<\/a>/i);
    const linkId = linkMatch ? linkMatch[1] : `JDRollUserControlLink${controlIdNum}_child`;
    const innerText = linkMatch ? linkMatch[2] : '';

    // Field type
    const typeMatch = (linkMatch ? linkMatch[0] : innerContent).match(/data-type=["']([^"']*)["']/i);
    let rawType = typeMatch ? typeMatch[1].trim() : 'text';
    let type: TemplateFieldType = 'text';
    if (rawType === 'textarea') {
      type = 'textarea';
    } else if (rawType === 'JDRollEditableSelect' || rawType === 'select') {
      type = 'JDRollEditableSelect';
    } else {
      type = 'text';
    }

    // Extract select options from `<input id="JDRollUserControl_X_hide" value="..."/>`
    const hideMatch = innerContent.match(/<input\s+[^>]*id=["']JDRollUserControl_\d+_hide["']\s+value=["']([^"']*)["']/i);
    const optionsRaw = hideMatch ? hideMatch[1] : '';
    const options = optionsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const isDefaultEmpty = innerText === 'Empty' || innerContent.includes('editable-empty');
    const defaultValue = isDefaultEmpty ? '' : innerText.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    fields.push({
      id: controlIdNum,
      linkId,
      type,
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      height: Math.round(height),
      defaultValue,
      options,
    });
  }

  const maxIdFound = fields.reduce((max, f) => Math.max(max, f.id), 0);
  maxCount = Math.max(maxCount, maxIdFound);

  return { maxCount, fields };
}

/**
 * Serializes structured `TemplateField` objects into the backward-compatible
 * HTML string stored in `campagne_config.template_fields`.
 */
export function serializeTemplateFields(maxCount: number, fields: TemplateField[]): string {
  const actualMax = Math.max(maxCount, ...fields.map((f) => f.id), 0);
  let html = `<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="${actualMax}"></div>`;

  for (const f of fields) {
    const isTextarea = f.type === 'textarea';
    const isSelect = f.type === 'JDRollEditableSelect';
    const typeAttr = isSelect ? 'JDRollEditableSelect' : isTextarea ? 'textarea' : 'text';

    const isEmpty = !f.defaultValue || f.defaultValue.trim() === '';
    const displayVal = isEmpty ? 'Empty' : f.defaultValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const emptyClass = isEmpty ? ' editable-empty' : '';
    const preWrapClass = isTextarea ? ' editable-pre-wrapped' : '';

    const optInput =
      isSelect && f.options && f.options.length > 0
        ? `<input type="hidden" id="JDRollUserControl_${f.id}_hide" value="${f.options.join(',')},">`
        : '';

    html += `<div class="ui-draggable ui-draggable-handle JDRollDroppedUserControl ui-resizable" id="JDRollUserControl_${f.id}" style="position: absolute; top: ${Math.round(f.top)}px; left: ${Math.round(f.left)}px; width: ${Math.round(f.width)}px; right: auto; height: ${Math.round(f.height)}px; bottom: auto;"><a id="${f.linkId || `JDRollUserControlLink${f.id}_child`}" data-type="${typeAttr}" data-pk="1" class="editable${preWrapClass} editable-click editable-unsaved${emptyClass}" data-original-title="" title="" style="background-color: rgba(0, 0, 0, 0);">${displayVal}</a>${optInput}<div class="ui-resizable-handle ui-resizable-e" style="z-index: 90; display: block;"></div><div class="ui-resizable-handle ui-resizable-s" style="z-index: 90; display: block;"></div><div class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se" style="z-index: 90; display: block;"></div></div>`;
  }

  return html;
}

/**
 * Parses the HTML string stored in `personnages.perso_fields` into
 * a dictionary mapping each `linkId` to its string value.
 */
export function parsePersoFields(persoFieldsHtml?: string | null): Record<string, string> {
  const values: Record<string, string> = {};
  if (!persoFieldsHtml || !persoFieldsHtml.trim()) {
    return values;
  }

  // Supports multi-line values in input value attribute
  const regex = /<input[^>]*id=["']([^"']*)_hidden["'][^>]*value=(?:"([\s\S]*?)"|'([\s\S]*?)')/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(persoFieldsHtml)) !== null) {
    const linkId = match[1];
    const val = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : '';
    values[linkId] = val.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  return values;
}

/**
 * Serializes a dictionary of field values into the HTML string
 * format stored in `personnages.perso_fields`.
 */
export function serializePersoFields(values: Record<string, string>): string {
  let html = '';
  for (const [linkId, val] of Object.entries(values)) {
    if (val !== undefined && val !== null) {
      const escaped = val
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      html += `<input type="hidden" id="${linkId}_hidden" value="${escaped}">`;
    }
  }
  return html;
}
