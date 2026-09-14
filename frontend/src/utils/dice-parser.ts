/**
 * Utilitaire de rendu et de parsing visuel des dés JdRoll
 * Transforme les motifs textuels du type `d8 ( 2 )`, `d6 ( 5 )`, `du ( 1 )`, `df ( -1 )`
 * en images vectorielles SVG précises représentant la forme géométrique du dé avec son résultat au centre.
 */

export interface DieInfo {
  type: string;
  value: string;
  raw: string;
}

/**
 * Calcule la taille de police adaptée selon le nombre de caractères à afficher
 */
function getFontSize(valStr: string, baseSize: number = 13): number {
  const len = valStr.length;
  if (len <= 1) return baseSize;
  if (len === 2) return Math.max(baseSize - 2.5, 10);
  if (len === 3) return Math.max(baseSize - 4.5, 8.5);
  return Math.max(baseSize - 6, 7.5);
}

/**
 * Génère l'image SVG correspondant à un type de dé et sa valeur
 */
export function renderDieSvg(dieType: string, rawValue: string | number): string {
  const typeLower = (dieType || 'd6').toLowerCase();
  const valStr = String(rawValue).trim();
  const title = `${dieType} ( ${valStr} )`;

  // 1. Dé Ubiquity (du)
  if (typeLower === 'du') {
    const isSuccess = valStr === '1' || valStr.toLowerCase() === 'succès';
    const bg = isSuccess ? '#ECFDF5' : '#F8FAFC';
    const stroke = isSuccess ? '#10B981' : '#94A3B8';
    const textFill = isSuccess ? '#065F46' : '#475569';
    const fontSize = getFontSize(valStr, 14);

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <rect x="3" y="3" width="30" height="30" rx="8" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
  <rect x="6" y="6" width="24" height="24" rx="5" fill="none" stroke="${stroke}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="${textFill}">${valStr}</text>
</svg>`.trim();
  }

  // 2. Dé Fudge (df)
  if (typeLower === 'df') {
    const num = parseInt(valStr, 10);
    let displayVal = valStr;
    let bg = '#F8FAFC';
    let stroke = '#94A3B8';
    let textFill = '#475569';

    if (valStr === '+' || valStr === '+1' || num > 0) {
      displayVal = '+';
      bg = '#ECFDF5';
      stroke = '#10B981';
      textFill = '#047857';
    } else if (valStr === '-' || valStr === '-1' || num < 0) {
      displayVal = '-';
      bg = '#FFF1F2';
      stroke = '#F43F5E';
      textFill = '#BE123C';
    } else {
      displayVal = '0';
    }

    const fontSize = displayVal === '+' || displayVal === '-' ? 18 : 13;
    const yOffset = displayVal === '+' ? 19 : displayVal === '-' ? 18 : 19;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <rect x="3" y="3" width="30" height="30" rx="6" fill="${bg}" stroke="${stroke}" stroke-width="2"/>
  <rect x="6" y="6" width="24" height="24" rx="4" fill="none" stroke="${stroke}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="18" y="${yOffset}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${fontSize}" fill="${textFill}">${displayVal}</text>
</svg>`.trim();
  }

  // 3. Dé à 4 faces (d4 - Triangle)
  if (typeLower === 'd4') {
    const fontSize = getFontSize(valStr, 12);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,3 33,31 3,31" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <line x1="18" y1="3" x2="18" y2="22" stroke="#818CF8" stroke-width="1.2" stroke-dasharray="1 1"/>
  <line x1="3" y1="31" x2="18" y2="22" stroke="#818CF8" stroke-width="1.2" stroke-dasharray="1 1"/>
  <line x1="33" y1="31" x2="18" y2="22" stroke="#818CF8" stroke-width="1.2" stroke-dasharray="1 1"/>
  <text x="18" y="23" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 4. Dé à 6 faces (d6 - Cube)
  if (typeLower === 'd6') {
    const fontSize = getFontSize(valStr, 13.5);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <rect x="3" y="3" width="30" height="30" rx="6" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2"/>
  <rect x="6" y="6" width="24" height="24" rx="4" fill="none" stroke="#C7D2FE" stroke-width="1"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 5. Dé à 8 faces (d8 - Octaèdre / Losange)
  if (typeLower === 'd8') {
    const fontSize = getFontSize(valStr, 13);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,2 33,18 18,34 3,18" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <line x1="18" y1="2" x2="18" y2="34" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="3" y1="18" x2="33" y2="18" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 6. Dé à 10 faces (d10 / d100 - Pentagonal Trapezohedron / Bouclier)
  if (typeLower === 'd10' || typeLower === 'd00' || typeLower === 'd100') {
    const fontSize = getFontSize(valStr, typeLower === 'd100' ? 10 : 12.5);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,2 33,12 28,32 8,32 3,12" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <line x1="18" y1="2" x2="18" y2="20" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="3" y1="12" x2="18" y2="20" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="33" y1="12" x2="18" y2="20" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="8" y1="32" x2="18" y2="20" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <line x1="28" y1="32" x2="18" y2="20" stroke="#818CF8" stroke-width="1" stroke-opacity="0.5"/>
  <text x="18" y="20" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 7. Dé à 12 faces (d12 - Dodécaèdre)
  if (typeLower === 'd12') {
    const fontSize = getFontSize(valStr, 12);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,2 31,7 34,21 25,33 11,33 2,21 5,7" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="18,10 26,16 23,26 13,26 10,16" fill="#E0E7FF" stroke="#818CF8" stroke-width="1"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 8. Dé à 20 faces (d20 - Icosaèdre)
  if (typeLower === 'd20') {
    const fontSize = getFontSize(valStr, 12);
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <polygon points="18,8 29,24 7,24" fill="#E0E7FF" stroke="#818CF8" stroke-width="1"/>
  <line x1="18" y1="2" x2="18" y2="8" stroke="#818CF8" stroke-width="1"/>
  <line x1="4" y1="10" x2="7" y2="24" stroke="#818CF8" stroke-width="1"/>
  <line x1="32" y1="10" x2="29" y2="24" stroke="#818CF8" stroke-width="1"/>
  <line x1="4" y1="26" x2="7" y2="24" stroke="#818CF8" stroke-width="1"/>
  <line x1="32" y1="26" x2="29" y2="24" stroke="#818CF8" stroke-width="1"/>
  <line x1="18" y1="34" x2="18" y2="24" stroke="#818CF8" stroke-width="1"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
  }

  // 9. Dé générique (dX - Polyèdre générique)
  const fontSize = getFontSize(valStr, 12);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="inline-block align-middle mx-0.5 my-0.5 w-7 h-7 select-none filter drop-shadow-xs" role="img" aria-label="${title}" title="${title}">
  <polygon points="18,2 32,9 32,27 18,34 4,27 4,9" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2" stroke-linejoin="round"/>
  <line x1="18" y1="2" x2="18" y2="34" stroke="#818CF8" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="4" y1="9" x2="32" y2="27" stroke="#818CF8" stroke-width="1" stroke-opacity="0.4"/>
  <line x1="4" y1="27" x2="32" y2="9" stroke="#818CF8" stroke-width="1" stroke-opacity="0.4"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" fill="#312E81">${valStr}</text>
</svg>`.trim();
}

/**
 * Expression régulière pour identifier les dés au format de compatibilité standard :
 * `d8 ( 2 )`, `d6 ( 5 )`, `du ( 1 )`, `df ( -1 )`, `d100 ( 75 )`, etc.
 */
export const DICE_PATTERN = /\b(d[a-zA-Z0-9]+)\s*\(\s*([^)]+?)\s*\)/gi;

/**
 * Remplace dans une chaîne de texte brut tous les motifs de dés par leur image SVG
 */
export function parseDiceInText(text: string): string {
  if (!text) return text;
  return text.replace(DICE_PATTERN, (_match, dieType, val) => {
    return renderDieSvg(dieType, val);
  });
}

/**
 * Remplace dans une chaîne HTML les motifs de dés par leur image SVG,
 * en veillant à ne pas altérer les balises ou attributs HTML.
 */
export function parseDiceInHtml(html: string): string {
  if (!html) return html;

  // Découpage du HTML en alternance de balises <...> et de contenu texte
  const parts = html.split(/(<[^>]+>)/g);
  return parts
    .map((part) => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return part; // balise HTML non modifiée
      }
      return parseDiceInText(part);
    })
    .join('');
}
