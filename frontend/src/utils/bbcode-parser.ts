import { parseDiceInHtml } from './dice-parser';

export interface ParseMessageOptions {
  currentUser?: {
    id?: number;
    username?: string;
    profil?: number;
    isAdmin?: boolean;
  } | null;
  isMj?: boolean;
  authorUserId?: number;
  authorPersoId?: number;
  userCharacterNames?: string[];
  campaignId?: number;
  parseDice?: boolean;
}

/**
 * Échappe les caractères HTML spéciaux pour sécuriser l'injection dans le template
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Vérifie si l'utilisateur courant a le droit d'accéder à la zone privée.
 */
export function canViewPrivateZone(
  targetRaw: string,
  options?: ParseMessageOptions
): boolean {
  if (!options) return false;

  // 1. Un administrateur système ou le MJ de la campagne voit toujours tout
  if (options.currentUser?.isAdmin || options.currentUser?.profil === 1 || options.isMj) {
    return true;
  }

  // 2. L'auteur du message peut toujours relire ce qu'il a écrit
  if (
    options.authorUserId !== undefined &&
    options.currentUser?.id !== undefined &&
    options.currentUser.id === options.authorUserId
  ) {
    return true;
  }

  // 3. Analyse des cibles (séparées par des virgules ou points-virgules)
  const targets = targetRaw
    .split(/[,;]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const currentUsername = (options.currentUser?.username || '').toLowerCase();
  const userChars = (options.userCharacterNames || []).map((c) => c.toLowerCase());

  for (const t of targets) {
    // Si la cible est "admin", "mj", ou "gm"
    if (t === 'admin' || t === 'mj' || t === 'gm') {
      if (options.currentUser?.isAdmin || options.currentUser?.profil === 1 || options.isMj) {
        return true;
      }
    }

    // Si la cible est "pj" (joueurs)
    if (t === 'pj') {
      if (userChars.length > 0 || !options.isMj) {
        return true;
      }
    }

    // Si la cible est "pnj"
    if (t === 'pnj') {
      if (options.isMj) {
        return true;
      }
    }

    // Correspondance avec le nom d'utilisateur
    if (currentUsername && t === currentUsername) {
      return true;
    }

    // Correspondance avec l'un des personnages du joueur courant
    if (userChars.includes(t)) {
      return true;
    }
  }

  return false;
}

/**
 * Remplace récursivement les balises BBCode pour gérer le bon imbriquement
 */
export function parseBbcode(rawHtml: string, options?: ParseMessageOptions): string {
  if (!rawHtml) return rawHtml;

  let result = rawHtml;
  let hasChanged = true;
  let iterations = 0;
  const maxIterations = 10;

  while (hasChanged && iterations < maxIterations) {
    const before = result;
    iterations++;

    // 1. Balise [hide] ou [hide=Titre] ... [/hide]
    result = result.replace(
      /\[hide(?:=([^\]]*))?\]([\s\S]*?)\[\/hide\]/gi,
      (_match, titleParam, innerContent) => {
        const title = titleParam && titleParam.trim() ? titleParam.trim() : 'Texte masqué';
        return `
<details class="hide-box my-2.5 rounded-xl border border-slate-200 bg-slate-50/80 group">
  <summary class="cursor-pointer font-semibold text-xs sm:text-sm text-indigo-700 hover:text-indigo-900 px-3.5 py-2.5 flex items-center justify-between select-none transition-colors">
    <span class="flex items-center gap-2">
      <svg class="w-4 h-4 text-indigo-500 transition-transform duration-200 group-open:rotate-90 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      <span>${escapeHtml(title)}</span>
    </span>
    <span class="text-[11px] font-normal text-slate-500 group-open:hidden">Cliquer pour déplier</span>
    <span class="text-[11px] font-normal text-slate-500 hidden group-open:inline">Cliquer pour replier</span>
  </summary>
  <div class="hide-content px-3.5 pb-3.5 pt-2 border-t border-slate-200/80 text-slate-800 text-sm leading-relaxed">
    ${innerContent}
  </div>
</details>`.trim();
      }
    );

    // 2. Balise [private=Destinataire] ... [/private]
    result = result.replace(
      /\[private=([^\]]+)\]([\s\S]*?)\[\/private\]/gi,
      (_match, targetParam, innerContent) => {
        const target = targetParam ? targetParam.trim() : 'Destinataire';
        const isAllowed = canViewPrivateZone(target, options);

        if (isAllowed) {
          return `
<div class="private-box my-3 border border-amber-300 bg-amber-50/90 rounded-xl p-3.5 shadow-xs">
  <div class="flex items-center gap-2 text-xs font-bold text-amber-900 pb-2 mb-2 border-b border-amber-200">
    <svg class="w-4 h-4 text-amber-700 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    <span>Message privé pour : <span class="font-semibold text-amber-800">${escapeHtml(target)}</span></span>
  </div>
  <div class="private-content text-slate-800 text-sm leading-relaxed">
    ${innerContent}
  </div>
</div>`.trim();
        } else {
          return `
<div class="private-box-hidden my-2.5 border border-slate-200 bg-slate-100/90 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 select-none">
  <svg class="w-4 h-4 text-slate-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  <span>Message privé destiné à : <strong class="font-semibold text-slate-700">${escapeHtml(target)}</strong></span>
</div>`.trim();
        }
      }
    );

    // 3. Balise [pnj=NomOuId]Label[/pnj]
    result = result.replace(
      /\[pnj=([^\]]+)\]([\s\S]*?)\[\/pnj\]/gi,
      (_match, targetParam, labelParam) => {
        const target = targetParam ? targetParam.trim() : '';
        const label = labelParam && labelParam.trim() ? labelParam.trim() : target;
        return `
<a href="#" data-pnj="${escapeHtml(target)}" class="pnj-link inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 border border-purple-200 text-xs sm:text-sm font-semibold transition cursor-pointer no-underline shadow-2xs" title="Voir la fiche du PNJ : ${escapeHtml(target)}">
  <svg class="w-3.5 h-3.5 text-purple-600 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  <span>${escapeHtml(label)}</span>
</a>`.trim();
      }
    );

    // 4. Balise [carte=IdOuNom]Label[/carte]
    result = result.replace(
      /\[carte=([^\]]+)\]([\s\S]*?)\[\/carte\]/gi,
      (_match, targetParam, labelParam) => {
        const target = targetParam ? targetParam.trim() : '';
        const label = labelParam && labelParam.trim() ? labelParam.trim() : `Carte #${target}`;
        const campaignId = options?.campaignId;
        const carteUrl = campaignId ? `/campaigns/${campaignId}/cartes/${encodeURIComponent(target)}` : `/cartes/${encodeURIComponent(target)}`;

        return `
<a href="${carteUrl}" target="_blank" rel="noopener noreferrer" class="carte-link inline-flex items-center gap-1.5 px-2.5 py-1 mx-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border border-emerald-300 text-xs sm:text-sm font-semibold transition no-underline shadow-2xs" title="Ouvrir la carte : ${escapeHtml(label)}">
  <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
  <span>${escapeHtml(label)}</span>
</a>`.trim();
      }
    );

    hasChanged = before !== result;
  }

  return result;
}

/**
 * Parse l'ensemble du contenu HTML d'un message (balises BBCode + SVG des dés)
 */
export function parseMessageContent(
  rawHtml: string,
  options?: ParseMessageOptions
): string {
  if (!rawHtml) return rawHtml;

  // 1. Parsing BBCode
  let processed = parseBbcode(rawHtml, options);

  // 2. Parsing des dés (si activé, par défaut oui)
  if (options?.parseDice !== false) {
    processed = parseDiceInHtml(processed);
  }

  return processed;
}
