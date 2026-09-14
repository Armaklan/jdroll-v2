export interface SingleDieResult {
  type: 'standard' | 'ubiquity' | 'fudge';
  faces?: number;
  value: number;
  kept?: boolean;
  matched?: boolean;
}

export interface TermEvaluation {
  sign: '+' | '-';
  rawTerm: string;
  type: 'dice' | 'group' | 'constant';
  dice: SingleDieResult[];
  keptDice?: SingleDieResult[];
  modifierType?: 'g' | 'l' | '>' | '<' | '>=' | '<=' | '=' | null;
  modifierValue?: number | null;
  subtotal: number;
  description?: string;
}

export interface DiceRollEvaluation {
  formula: string;
  terms: TermEvaluation[];
  total: number;
  isSuccessCount: boolean;
  summaryText: string;
  detailsHtml: string;
}

export type RngFunction = () => number;

/**
 * Lance un dé standard à N faces (1..N)
 */
export function rollStandardDie(faces: number, rng: RngFunction = Math.random): number {
  return Math.floor(rng() * faces) + 1;
}

/**
 * Lance un dé Ubiquity (0 ou 1 avec 50% de chance chacun)
 */
export function rollUbiquityDie(rng: RngFunction = Math.random): number {
  return Math.floor(rng() * 2);
}

/**
 * Lance un dé Fudge (-1, 0, +1 avec 33.33% de chance chacun)
 */
export function rollFudgeDie(rng: RngFunction = Math.random): number {
  return Math.floor(rng() * 3) - 1;
}

/**
 * Évalue une formule de jet de dés
 */
export function evaluateDiceFormula(
  rawFormula: string,
  description: string = '',
  rng: RngFunction = Math.random
): DiceRollEvaluation {
  const formula = rawFormula.trim();
  if (!formula) {
    throw new Error('La formule de dé ne peut pas être vide');
  }

  // Découpage en termes de niveau supérieur respectant les parenthèses
  const terms = splitTopLevelTerms(formula);
  if (terms.length === 0) {
    throw new Error(`Formule de dés invalide : "${formula}"`);
  }

  const evaluatedTerms: TermEvaluation[] = [];
  let total = 0;
  let isSuccessCount = false;

  for (const termInfo of terms) {
    const evaluated = evaluateSingleTerm(termInfo.sign, termInfo.expr, rng);
    evaluatedTerms.push(evaluated);

    if (evaluated.modifierType === '>' || evaluated.modifierType === '<' || evaluated.modifierType === '>=' || evaluated.modifierType === '<=' || evaluated.modifierType === '=') {
      isSuccessCount = true;
    }

    if (termInfo.sign === '+') {
      total += evaluated.subtotal;
    } else {
      total -= evaluated.subtotal;
    }
  }

  // Construction du texte de résumé et du rendu HTML
  const summaryText = buildSummaryText(evaluatedTerms, total, isSuccessCount);
  const detailsHtml = buildDetailsHtml(evaluatedTerms);

  return {
    formula,
    terms: evaluatedTerms,
    total,
    isSuccessCount,
    summaryText,
    detailsHtml,
  };
}

interface TermSplit {
  sign: '+' | '-';
  expr: string;
}

/**
 * Découpe une expression selon les opérateurs + et - au niveau 0 (hors parenthèses)
 */
function splitTopLevelTerms(formula: string): TermSplit[] {
  const result: TermSplit[] = [];
  let currentExpr = '';
  let currentSign: '+' | '-' = '+';
  let depth = 0;

  const cleaned = formula.replace(/\s+/g, ' ');

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === '(') {
      depth++;
      currentExpr += char;
    } else if (char === ')') {
      depth--;
      currentExpr += char;
    } else if (depth === 0 && (char === '+' || char === '-')) {
      const trimmed = currentExpr.trim();
      if (trimmed) {
        result.push({ sign: currentSign, expr: trimmed });
      }
      currentSign = char as '+' | '-';
      currentExpr = '';
    } else {
      currentExpr += char;
    }
  }

  const lastTrimmed = currentExpr.trim();
  if (lastTrimmed) {
    result.push({ sign: currentSign, expr: lastTrimmed });
  }

  return result;
}

/**
 * Évalue un terme individuel : constante, groupe avec modificateur, ou jet de dés simple
 */
function evaluateSingleTerm(
  sign: '+' | '-',
  rawExpr: string,
  rng: RngFunction
): TermEvaluation {
  const expr = rawExpr.trim();

  // 1. Constante entière (ex: "3", "10")
  if (/^\d+$/.test(expr)) {
    const val = parseInt(expr, 10);
    return {
      sign,
      rawTerm: expr,
      type: 'constant',
      dice: [],
      subtotal: val,
    };
  }

  // 2. Groupe entre parenthèses : (1d8 + 2d6)g1 ou (1d8 + 2d6) ou (3d6)>4
  const groupMatch = expr.match(/^\((.+)\)(?:([gl]|>=|<=|>|<|=)(\d+))?$/i);
  if (groupMatch) {
    const innerContent = groupMatch[1];
    const modifierType = (groupMatch[2] ? groupMatch[2].toLowerCase() : null) as TermEvaluation['modifierType'];
    const modifierValue = groupMatch[3] ? parseInt(groupMatch[3], 10) : null;

    // Découper les sous-termes du groupe
    const subTermSplits = splitTopLevelTerms(innerContent);
    const groupDice: SingleDieResult[] = [];
    let standardSubtotal = 0;

    for (const sub of subTermSplits) {
      const evaluatedSub = evaluateSingleTerm(sub.sign, sub.expr, rng);
      for (const d of evaluatedSub.dice) {
        groupDice.push({ ...d });
      }
      if (sub.sign === '+') {
        standardSubtotal += evaluatedSub.subtotal;
      } else {
        standardSubtotal -= evaluatedSub.subtotal;
      }
    }

    if (groupDice.length === 0) {
      return {
        sign,
        rawTerm: expr,
        type: 'group',
        dice: [],
        subtotal: standardSubtotal,
      };
    }

    // Application du modificateur sur l'ensemble des dés du groupe
    const { subtotal, keptDice } = applyModifierToDice(groupDice, modifierType, modifierValue, standardSubtotal);

    return {
      sign,
      rawTerm: expr,
      type: 'group',
      dice: groupDice,
      keptDice,
      modifierType,
      modifierValue,
      subtotal,
    };
  }

  // 3. Expression de dé simple : 3d6, 4df, 3du, 3d8g2, 3d8l2, 3d10>7, 3d10<7, etc.
  // Regex : ^(\d+)?d(u|f|\d+)(?:([gl]|>=|<=|>|<|=)(\d+))?$
  const diceMatch = expr.match(/^(\d+)?d(u|f|\d+)(?:([gl]|>=|<=|>|<|=)(\d+))?$/i);
  if (!diceMatch) {
    throw new Error(`Syntaxe de dé non reconnue : "${expr}"`);
  }

  const countStr = diceMatch[1];
  const count = countStr ? parseInt(countStr, 10) : 1;
  const dieType = diceMatch[2].toLowerCase();
  const modifierType = (diceMatch[3] ? diceMatch[3].toLowerCase() : null) as TermEvaluation['modifierType'];
  const modifierValue = diceMatch[4] ? parseInt(diceMatch[4], 10) : null;

  if (count <= 0 || count > 100) {
    throw new Error(`Le nombre de dés doit être compris entre 1 et 100 (reçu: ${count})`);
  }

  const rolledDice: SingleDieResult[] = [];

  if (dieType === 'u') {
    // Ubiquity dice
    for (let i = 0; i < count; i++) {
      rolledDice.push({
        type: 'ubiquity',
        value: rollUbiquityDie(rng),
      });
    }
  } else if (dieType === 'f') {
    // Fudge dice
    for (let i = 0; i < count; i++) {
      rolledDice.push({
        type: 'fudge',
        value: rollFudgeDie(rng),
      });
    }
  } else {
    // Standard dice
    const faces = parseInt(dieType, 10);
    if (faces <= 0 || faces > 1000) {
      throw new Error(`Le nombre de faces doit être compris entre 1 et 1000 (reçu: ${faces})`);
    }
    for (let i = 0; i < count; i++) {
      rolledDice.push({
        type: 'standard',
        faces,
        value: rollStandardDie(faces, rng),
      });
    }
  }

  const defaultSum = rolledDice.reduce((acc, d) => acc + d.value, 0);
  const { subtotal, keptDice } = applyModifierToDice(rolledDice, modifierType, modifierValue, defaultSum);

  return {
    sign,
    rawTerm: expr,
    type: 'dice',
    dice: rolledDice,
    keptDice,
    modifierType,
    modifierValue,
    subtotal,
  };
}

/**
 * Applique les modificateurs gN, lN, >N, <N, >=N, <=N, =N sur un tableau de dés
 */
function applyModifierToDice(
  dice: SingleDieResult[],
  modifierType: TermEvaluation['modifierType'],
  modifierValue: number | null,
  fallbackSum: number
): { subtotal: number; keptDice: SingleDieResult[] } {
  if (!modifierType || modifierValue === null) {
    return {
      subtotal: fallbackSum,
      keptDice: dice.map((d) => {
        d.kept = true;
        return d;
      }),
    };
  }

  if (modifierType === 'g') {
    // Conserve les N meilleurs (greatest)
    const sorted = [...dice].sort((a, b) => b.value - a.value);
    const toKeepCount = Math.min(Math.max(modifierValue, 0), dice.length);
    const keptSet = new Set(sorted.slice(0, toKeepCount));

    for (const d of dice) {
      d.kept = keptSet.has(d);
    }

    const subtotal = dice.filter((d) => d.kept).reduce((acc, d) => acc + d.value, 0);
    return { subtotal, keptDice: dice.filter((d) => d.kept) };
  }

  if (modifierType === 'l') {
    // Conserve les N moins bons (lowest / less)
    const sorted = [...dice].sort((a, b) => a.value - b.value);
    const toKeepCount = Math.min(Math.max(modifierValue, 0), dice.length);
    const keptSet = new Set(sorted.slice(0, toKeepCount));

    for (const d of dice) {
      d.kept = keptSet.has(d);
    }

    const subtotal = dice.filter((d) => d.kept).reduce((acc, d) => acc + d.value, 0);
    return { subtotal, keptDice: dice.filter((d) => d.kept) };
  }

  if (modifierType === '>') {
    for (const d of dice) {
      d.matched = d.value > modifierValue;
      d.kept = d.matched;
    }
    const count = dice.filter((d) => d.matched).length;
    return { subtotal: count, keptDice: dice.filter((d) => d.matched) };
  }

  if (modifierType === '>=') {
    for (const d of dice) {
      d.matched = d.value >= modifierValue;
      d.kept = d.matched;
    }
    const count = dice.filter((d) => d.matched).length;
    return { subtotal: count, keptDice: dice.filter((d) => d.matched) };
  }

  if (modifierType === '<') {
    for (const d of dice) {
      d.matched = d.value < modifierValue;
      d.kept = d.matched;
    }
    const count = dice.filter((d) => d.matched).length;
    return { subtotal: count, keptDice: dice.filter((d) => d.matched) };
  }

  if (modifierType === '<=') {
    for (const d of dice) {
      d.matched = d.value <= modifierValue;
      d.kept = d.matched;
    }
    const count = dice.filter((d) => d.matched).length;
    return { subtotal: count, keptDice: dice.filter((d) => d.matched) };
  }

  if (modifierType === '=') {
    for (const d of dice) {
      d.matched = d.value === modifierValue;
      d.kept = d.matched;
    }
    const count = dice.filter((d) => d.matched).length;
    return { subtotal: count, keptDice: dice.filter((d) => d.matched) };
  }

  return { subtotal: fallbackSum, keptDice: dice };
}

/**
 * Formate un dé individuel sous la forme standard de compatibilité : d8 ( 2 )
 */
export function formatDieExpression(die: SingleDieResult): string {
  if (die.type === 'ubiquity') {
    return `du ( ${die.value} )`;
  }
  if (die.type === 'fudge') {
    return `df ( ${die.value} )`;
  }
  return `d${die.faces ?? 6} ( ${die.value} )`;
}

/**
 * Construit un résumé textuel du jet
 */
function buildSummaryText(terms: TermEvaluation[], total: number, isSuccessCount: boolean): string {
  const parts: string[] = [];

  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    const prefix = i === 0 ? (t.sign === '-' ? '-' : '') : ` ${t.sign} `;

    if (t.type === 'constant') {
      parts.push(`${prefix}${t.subtotal}`);
    } else if (t.dice.length > 0) {
      const diceExprs = t.dice.map((d) => formatDieExpression(d)).join(' + ');
      if (t.modifierType === 'g' || t.modifierType === 'l') {
        const keptExprs = (t.keptDice || []).map((d) => formatDieExpression(d)).join(' + ');
        parts.push(`${prefix}${t.rawTerm} [ ${diceExprs} ] -> retenus [ ${keptExprs} ]`);
      } else if (t.modifierType && ['>', '<', '>=', '<=', '='].includes(t.modifierType)) {
        const matchedExprs = (t.keptDice || []).map((d) => formatDieExpression(d)).join(', ');
        parts.push(`${prefix}${t.rawTerm} [ ${diceExprs} ] -> succès [ ${matchedExprs} ] (${t.subtotal})`);
      } else {
        parts.push(`${prefix}${diceExprs}`);
      }
    }
  }

  const suffix = isSuccessCount ? (total > 1 ? `${total} succès` : `${total} succès`) : `${total}`;
  return `${parts.join('')} = ${suffix}`;
}

/**
 * Formate la valeur d'un dé pour affichage
 */
function formatDieValue(die: SingleDieResult): string {
  if (die.type === 'fudge') {
    return die.value > 0 ? `+${die.value}` : `${die.value}`;
  }
  return `${die.value}`;
}

/**
 * Construit les fragments HTML pour le rendu riche
 */
function buildDetailsHtml(terms: TermEvaluation[]): string {
  const parts: string[] = [];

  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    const signPrefix = i === 0 ? (t.sign === '-' ? '- ' : '') : ` ${t.sign} `;

    if (t.type === 'constant') {
      parts.push(`${signPrefix}<span class="font-semibold">${t.subtotal}</span>`);
    } else if (t.dice.length > 0) {
      const diceSpans = t.dice
        .map((d) => {
          const dieExpr = formatDieExpression(d);
          if (d.kept === false) {
            return `<span class="line-through opacity-40 inline-block">${dieExpr}</span>`;
          }
          if (d.matched) {
            return `<span class="font-bold text-emerald-700 inline-block">${dieExpr}</span>`;
          }
          return `<span class="font-medium inline-block">${dieExpr}</span>`;
        })
        .join(' ');

      if (t.modifierType === 'g' || t.modifierType === 'l') {
        const keptSpans = (t.keptDice || [])
          .map((d) => `<span class="font-bold text-indigo-700 inline-block">${formatDieExpression(d)}</span>`)
          .join(' ');
        parts.push(
          `${signPrefix}<span class="font-mono font-medium">${t.rawTerm}</span> (${diceSpans} &rarr; gardés [ ${keptSpans} ])`
        );
      } else if (t.modifierType && ['>', '<', '>=', '<=', '='].includes(t.modifierType)) {
        parts.push(
          `${signPrefix}<span class="font-mono font-medium">${t.rawTerm}</span> (${diceSpans} &rarr; <span class="font-semibold text-emerald-700">${t.subtotal} succès</span>)`
        );
      } else {
        parts.push(`${signPrefix}<span class="font-mono font-medium">${t.rawTerm}</span> (${diceSpans})`);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Échappe le HTML pour éviter les injections XSS
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Génère le contenu HTML complet du message de jet de dé
 */
export function generateDicePostContent(
  evaluation: DiceRollEvaluation,
  description: string
): string {
  const safeDescription = escapeHtml(description.trim() || 'Jet de dés');
  const safeFormula = escapeHtml(evaluation.formula);
  const resultDisplay = evaluation.isSuccessCount
    ? `${evaluation.total} succès`
    : `${evaluation.total}`;

  return `
<div class="dice-roll-card p-2 my-2 text-slate-800">
  <div class="flex items-center gap-2 font-bold text-sm text-indigo-700 pb-2">
    <span class="text-base">🎲</span>
    <span>Jet de dés : <span class="text-slate-900 font-semibold">${safeDescription}</span></span>
  </div>
  
  <div class="mt-3 space-y-2 text-xs text-slate-800">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-semibold text-slate-700">Formule demandée :</span>
      <code class="px-2 py-0.5font-mono font-bold text-indigo-600 text-xs">${safeFormula}</code>
    </div>
    
    <div class="flex flex-wrap items-center gap-1.5 leading-relaxed">
      <span class="font-semibold text-slate-700">Détail des dés :</span>
      <span class="text-slate-700">${evaluation.detailsHtml}</span>
    </div>
  </div>

  <div class="mt-2 pt-2 flex items-center justify-between">
    <span class="font-bold text-xs uppercase tracking-wider text-slate-500">Résultat final</span>
    <span class="text-lg font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 shadow-xs">
      ${resultDisplay}
    </span>
  </div>
</div>
`.trim();
}
