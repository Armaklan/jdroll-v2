import { getToken } from './auth';

export interface GrammarMatch {
  /** Position du premier caractère de l'erreur dans le texte envoyé */
  offset: number;
  /** Longueur de l'extrait erroné */
  length: number;
  /** Explication complète de l'erreur */
  message: string;
  /** Résumé court de l'erreur */
  shortMessage: string;
  /** Remplacements suggérés */
  replacements: string[];
  /** Identifiant de la règle LanguageTool */
  ruleId: string;
  /** Catégorie de la règle (ex: Grammaire, Orthographe) */
  category: string;
}

export const grammarApi = {
  /**
   * Vérifie la grammaire d'un texte via le proxy backend LanguageTool.
   */
  async check(text: string, language: string = 'fr-FR'): Promise<GrammarMatch[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/grammar/check', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, language }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Erreur requête (${response.status})`);
    }

    return (data.matches ?? []) as GrammarMatch[];
  },
};
