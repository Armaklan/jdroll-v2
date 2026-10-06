import { config } from '../config/env.js';

/** Taille maximale de texte acceptée pour une vérification grammaticale */
export const MAX_GRAMMAR_TEXT_LENGTH = 20000;

/** Langue par défaut du correcteur */
export const DEFAULT_GRAMMAR_LANGUAGE = 'fr-FR';

/** Langues supportées par le correcteur */
export const GRAMMAR_LANGUAGES = ['fr-FR', 'en-US'] as const;

export interface GrammarMatch {
  /** Position du premier caractère de l'erreur dans le texte envoyé */
  offset: number;
  /** Longueur de l'extrait erroné */
  length: number;
  /** Explication complète de l'erreur */
  message: string;
  /** Résumé court de l'erreur */
  shortMessage: string;
  /** Remplacements suggérés (au plus 3) */
  replacements: string[];
  /** Identifiant de la règle LanguageTool */
  ruleId: string;
  /** Catégorie de la règle (ex: Grammaire, Orthographe) */
  category: string;
}

export class LanguageToolUnavailableError extends Error {
  constructor(message = 'Correcteur grammatical indisponible') {
    super(message);
    this.name = this.constructor.name;
  }
}

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  shortMessage?: string;
  replacements?: Array<{ value: string }>;
  rule?: { id?: string; category?: { name?: string } };
}

interface LanguageToolResponse {
  matches?: LanguageToolMatch[];
}

const MAX_REPLACEMENTS = 3;

function mapMatch(match: LanguageToolMatch): GrammarMatch {
  return {
    offset: match.offset,
    length: match.length,
    message: match.message,
    shortMessage: match.shortMessage ?? '',
    replacements: (match.replacements ?? [])
      .slice(0, MAX_REPLACEMENTS)
      .map((r) => r.value),
    ruleId: match.rule?.id ?? '',
    category: match.rule?.category?.name ?? '',
  };
}

/**
 * Vérifie un texte via l'API LanguageTool et retourne les erreurs détectées.
 * Le fetch est injectable pour permettre les tests unitaires sans réseau.
 */
export async function checkGrammar(
  input: { text: string; language?: string },
  fetchFn: FetchLike = fetch,
  baseUrl: string = config.languageToolUrl
): Promise<GrammarMatch[]> {
  const language = input.language ?? DEFAULT_GRAMMAR_LANGUAGE;
  const body = new URLSearchParams({ text: input.text, language }).toString();

  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/v2/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new LanguageToolUnavailableError();
  }

  if (!response.ok) {
    throw new LanguageToolUnavailableError();
  }

  let data: LanguageToolResponse;
  try {
    data = (await response.json()) as LanguageToolResponse;
  } catch {
    throw new LanguageToolUnavailableError();
  }

  return (data.matches ?? []).map(mapMatch);
}
