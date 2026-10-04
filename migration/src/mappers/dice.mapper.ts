import { SourceDiceRequest, NewDiceRollData } from '../types.js';
import { decodeHtmlEntities } from './espritjdr.mapper.js';

/** Longueur maximale des colonnes jdroll dicer. */
const DICER_RESULT_MAX_LENGTH = 500;
const DICER_DESCRIPTION_MAX_LENGTH = 900;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Description d'un jet : le titre espritjdr décodé de ses entités HTML
 * (ex : "Jet pour X (Compétence) / 12 att bonus ( 0)").
 */
export function buildDiceDescription(diceRequest: SourceDiceRequest): string {
  return decodeHtmlEntities(diceRequest.title || 'Jet de dés');
}

/**
 * Convertit une ligne de jet espritjdr (format pipe) en formule jdroll.
 * Jet de compétence : le type de dé du champ Jet ("D10" -> "d10").
 * Jet générique (id de fiche = 0), trois variantes :
 * - "<nombre>|0|<dé>" (ex : "0|0|D6|3" -> "3d6") ;
 * - "<modificateur>|0|<dé>|<nombre>" (ex : "0|0|D6|-2|2" -> "2d6-2") ;
 * - "0|0|0|<formule>" : formule complète jdroll dans le champ suivant
 *   (ex : "0|0|0|d20||2|1|0" -> "d20", "0|0|0|2D10+1D4|1|1|0" -> "2d10+1d4").
 */
function buildJetFormula(jet: string): string {
  const fields = jet.split('|');
  const dice = (fields[2] ?? '').trim();
  if (fields[0] === '0') {
    if (dice === '' || dice === '0') {
      return (fields[3] ?? '').trim().toLowerCase();
    }
    const faces = dice.replace(/[dD]/g, '');
    const isGenericWithModifier = fields.length >= 5;
    const modifier = isGenericWithModifier ? fields[3].trim() : '';
    const count = ((isGenericWithModifier ? fields[4] : fields[3]) ?? '').trim();
    const base = `${count}d${faces}`;
    return modifier !== '' && modifier !== '0' ? `${base}${modifier}` : base;
  }
  return dice.toLowerCase();
}

/** Formule demandée d'une demande de jet : lignes de jet jointes par ' + '. */
export function buildDiceFormula(diceRequest: SourceDiceRequest): string {
  return diceRequest.jets.map(buildJetFormula).filter((formula) => formula !== '').join(' + ');
}

/**
 * Nettoie le rendu historique d'un jet (demande_jet.resultat) en lignes de
 * texte : entités décodées, images de dés remplacées par la notation jdroll
 * "dN ( V )" (rendue en SVG par le frontend), balises retirées, entête
 * "Demande de jet de dés de X :" supprimée.
 */
export function buildDiceResultLines(diceRequest: SourceDiceRequest): string[] {
  const raw = (diceRequest.resultat ?? '').trim();
  if (raw === '') {
    return [];
  }

  const withDice = decodeHtmlEntities(raw).replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/src\s*=\s*['"]([^'"]+)['"]/i);
    const dieMatch = srcMatch?.[1].match(/d(\d+)_[a-z0-9]+_(\d+)\.(?:png|gif|jpe?g)/i);
    return dieMatch ? `d${dieMatch[1]} ( ${dieMatch[2]} )` : '';
  });

  return withDice
    .replace(/<br\s*(?:\\|\/)?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .filter((line) => !/^Demande de jet de d[ée]s de .*:\s*$/i.test(line));
}

/** Résultat d'un jet en HTML : lignes nettoyées, échappées, jointes par <br />. */
export function buildDiceResultHtml(diceRequest: SourceDiceRequest): string {
  return buildDiceResultLines(diceRequest).map(escapeHtml).join('<br />');
}

/**
 * Contenu du post d'un jet de dés : même carte que les posts de jet du site
 * (dice-roll-card), avec le titre en description, la formule demandée et le
 * résultat historique nettoyé.
 */
export function buildDicePostContent(diceRequest: SourceDiceRequest): string {
  const description = escapeHtml(buildDiceDescription(diceRequest));
  const formula = escapeHtml(buildDiceFormula(diceRequest));
  const resultHtml = buildDiceResultHtml(diceRequest);
  const detail = resultHtml === '' ? 'Jet demandé, sans résultat enregistré.' : resultHtml;

  return `
<div class="dice-roll-card p-2 my-2 text-slate-800">
  <div class="flex items-center gap-2 font-bold text-sm text-indigo-700 pb-2">
    <span class="text-base">🎲</span>
    <span>Jet de dés : <span class="text-slate-900 font-semibold">${description}</span></span>
  </div>

  <div class="mt-3 space-y-2 text-xs text-slate-800">
    <div class="flex flex-wrap items-center gap-1.5">
      <span class="font-semibold text-slate-700">Formule demandée :</span>
      <code class="px-2 py-0.5 font-mono font-bold text-indigo-600 text-xs">${formula}</code>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 leading-relaxed">
      <span class="font-semibold text-slate-700">Détail des dés :</span>
      <span class="text-slate-700">${detail}</span>
    </div>
  </div>
</div>
`.trim();
}

/**
 * Mappe une demande de jet espritjdr en ligne dicer jdroll : description =
 * titre décodé, résultat = rendu historique nettoyé (tronqué à la taille de
 * la colonne), date de création du post lié si connu.
 */
export function mapDiceRequest(
  diceRequest: SourceDiceRequest,
  campagneId: number,
  userId: number,
  createDate: string | null
): NewDiceRollData {
  return {
    sourceId: diceRequest.id,
    userId,
    campagneId,
    createDate,
    result: buildDiceResultHtml(diceRequest).slice(0, DICER_RESULT_MAX_LENGTH),
    description: buildDiceDescription(diceRequest).slice(0, DICER_DESCRIPTION_MAX_LENGTH),
  };
}
