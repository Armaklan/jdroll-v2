import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkGrammar,
  LanguageToolUnavailableError,
  MAX_GRAMMAR_TEXT_LENGTH,
} from './languagetool.service.js';

const LT_URL = 'http://languagetool.test';

interface CapturedRequest {
  url: string;
  method: string;
  contentType: string;
  body: string;
}

function fakeFetchSuccess(ltResponse: unknown, captured: CapturedRequest[]) {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    captured.push({
      url: String(url),
      method: init?.method ?? 'GET',
      contentType: String(init?.headers?.['Content-Type'] ?? ''),
      body: String(init?.body ?? ''),
    });
    return new Response(JSON.stringify(ltResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

describe('checkGrammar', () => {
  it('envoie le texte et la langue à LanguageTool en formulaire encodé', async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = fakeFetchSuccess({ matches: [] }, captured);

    await checkGrammar({ text: 'Bonjour madame' }, fetchFn, LT_URL);

    assert.equal(captured.length, 1);
    assert.equal(captured[0].url, `${LT_URL}/v2/check`);
    assert.equal(captured[0].method, 'POST');
    assert.equal(captured[0].contentType, 'application/x-www-form-urlencoded');
    assert.ok(captured[0].body.includes('text=Bonjour+madame'));
    assert.ok(captured[0].body.includes('language=fr-FR'));
  });

  it('utilise la langue fournie quand elle est précisée', async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = fakeFetchSuccess({ matches: [] }, captured);

    await checkGrammar({ text: 'Hello', language: 'en-US' }, fetchFn, LT_URL);

    assert.ok(captured[0].body.includes('language=en-US'));
  });

  it('mappe les erreurs détectées avec au plus 3 remplacements', async () => {
    const ltResponse = {
      matches: [
        {
          offset: 9,
          length: 5,
          message: "Accord probable : « madame » devrait être « mademoiselle ».",
          shortMessage: 'Accord',
          replacements: [
            { value: 'mademoiselle' },
            { value: 'Madame' },
            { value: 'demoiselle' },
            { value: 'quatrième' },
          ],
          rule: { id: 'ACCORD_MADAME', category: { name: 'Grammaire' } },
        },
      ],
    };
    const fetchFn = fakeFetchSuccess(ltResponse, []);

    const matches = await checkGrammar({ text: 'Bonjour madame' }, fetchFn, LT_URL);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches[0], {
      offset: 9,
      length: 5,
      message: "Accord probable : « madame » devrait être « mademoiselle ».",
      shortMessage: 'Accord',
      replacements: ['mademoiselle', 'Madame', 'demoiselle'],
      ruleId: 'ACCORD_MADAME',
      category: 'Grammaire',
    });
  });

  it('tolère les matchs sans remplacements ni règle', async () => {
    const ltResponse = {
      matches: [{ offset: 0, length: 2, message: 'Problème', shortMessage: '' }],
    };
    const fetchFn = fakeFetchSuccess(ltResponse, []);

    const matches = await checkGrammar({ text: 'Ok' }, fetchFn, LT_URL);

    assert.equal(matches.length, 1);
    assert.deepEqual(matches[0].replacements, []);
    assert.equal(matches[0].ruleId, '');
    assert.equal(matches[0].category, '');
  });

  it('retourne une liste vide quand LanguageTool ne détecte rien', async () => {
    const fetchFn = fakeFetchSuccess({ matches: [] }, []);

    const matches = await checkGrammar({ text: 'Texte parfait.' }, fetchFn, LT_URL);

    assert.deepEqual(matches, []);
  });

  it('lève LanguageToolUnavailableError si LanguageTool répond en erreur', async () => {
    const fetchFn = async (): Promise<Response> =>
      new Response('boom', { status: 500 });

    await assert.rejects(
      () => checkGrammar({ text: 'Bonjour' }, fetchFn, LT_URL),
      (err: unknown) => err instanceof LanguageToolUnavailableError
    );
  });

  it('lève LanguageToolUnavailableError si LanguageTool est injoignable', async () => {
    const fetchFn = async (): Promise<Response> => {
      throw new Error('network down');
    };

    await assert.rejects(
      () => checkGrammar({ text: 'Bonjour' }, fetchFn, LT_URL),
      (err: unknown) => err instanceof LanguageToolUnavailableError
    );
  });

  it('expose une limite de taille de texte cohérente avec le contrôleur', () => {
    assert.ok(MAX_GRAMMAR_TEXT_LENGTH > 0);
  });
});
