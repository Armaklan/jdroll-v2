import { CampaignWidget, CampaignWidgetType } from '../types/campaign.js';

export function parseWidgets(raw?: string | null): CampaignWidget[] {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((w) => w && typeof w === 'object' && w.id && w.name && w.type)
      .map((w) => ({
        id: String(w.id),
        name: String(w.name),
        type: (['token', 'jauge', 'text'].includes(w.type) ? w.type : 'text') as CampaignWidgetType,
        low: w.low !== undefined ? w.low : 0,
        up: w.up !== undefined ? w.up : 0,
        value: w.value !== undefined ? w.value : (w.type === 'text' ? '' : 0),
      }));
  } catch {
    return [];
  }
}

export function serializeWidgets(widgets: CampaignWidget[]): string {
  return JSON.stringify(widgets);
}

export function mergeCharacterWidgets(
  campaignWidgetsRaw?: string | null,
  characterWidgetsRaw?: string | null
): CampaignWidget[] {
  const campaignWidgets = parseWidgets(campaignWidgetsRaw);
  const characterWidgets = parseWidgets(characterWidgetsRaw);

  if (campaignWidgets.length === 0 && characterWidgets.length === 0) {
    return [];
  }

  // If campaign has widgets, map each campaign widget to the character's value if set
  const charWidgetMap = new Map<string, CampaignWidget>();
  characterWidgets.forEach((cw) => {
    charWidgetMap.set(cw.id, cw);
    charWidgetMap.set(cw.name.toLowerCase(), cw);
  });

  const merged: CampaignWidget[] = [];
  const processedIds = new Set<string>();

  for (const cw of campaignWidgets) {
    const match = charWidgetMap.get(cw.id) || charWidgetMap.get(cw.name.toLowerCase());
    processedIds.add(cw.id);
    if (match) {
      merged.push({
        id: cw.id,
        name: cw.name,
        type: cw.type,
        low: match.low !== undefined && match.low !== '' ? match.low : cw.low,
        up: match.up !== undefined && match.up !== '' ? match.up : cw.up,
        value: match.value !== undefined ? match.value : cw.value,
      });
    } else {
      merged.push({
        id: cw.id,
        name: cw.name,
        type: cw.type,
        low: cw.low,
        up: cw.up,
        value: cw.value !== undefined ? cw.value : (cw.type === 'text' ? '' : 0),
      });
    }
  }

  // Include character widgets that might not be in the campaign config
  for (const pw of characterWidgets) {
    if (!processedIds.has(pw.id)) {
      merged.push(pw);
    }
  }

  return merged;
}

export function changeWidgetValue(
  widgets: CampaignWidget[],
  widgetId: string,
  delta: number
): CampaignWidget[] {
  return widgets.map((w) => {
    if (w.id !== widgetId) return w;

    const currentVal = Number(w.value) || 0;
    const lowVal = w.low !== undefined && w.low !== '' ? Number(w.low) : NaN;
    const upVal = w.up !== undefined && w.up !== '' ? Number(w.up) : NaN;

    let nextVal = currentVal + delta;

    if (w.type === 'jauge') {
      const min = !isNaN(lowVal) ? lowVal : 0;
      const max = !isNaN(upVal) && upVal > min ? upVal : 100;
      nextVal = Math.max(min, Math.min(max, nextVal));
    } else if (w.type === 'token') {
      nextVal = Math.max(0, nextVal);
    }

    return {
      ...w,
      value: nextVal,
    };
  });
}
