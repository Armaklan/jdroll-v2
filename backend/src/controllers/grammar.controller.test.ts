import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  GrammarController,
  grammarRoutes,
} from './grammar.controller.js';
import {
  LanguageToolUnavailableError,
  GrammarMatch,
} from '../services/languagetool.service.js';

const A_MATCH: GrammarMatch = {
  offset: 0,
  length: 2,
  message: 'Problème détecté',
  shortMessage: 'Problème',
  replacements: ['OK'],
  ruleId: 'TEST_RULE',
  category: 'Test',
};

async function buildTestApp(check: typeof import('../services/languagetool.service.js').checkGrammar) {
  const app = Fastify({ logger: false });
  // Stub d'authentification : les tests valident le contrat du contrôleur, pas le JWT
  app.decorate('authenticate', async () => {});
  const controller = new GrammarController(check);
  app.register(async (instance) => {
    controller.registerRoutes(instance as never);
  });
  await app.ready();
  return app;
}

describe('GrammarController (POST /api/grammar/check)', () => {
  let checkCalls: Array<{ text: string; language?: string }>;

  beforeEach(() => {
    checkCalls = [];
  });

  it('retourne 200 avec les erreurs détectées pour un texte valide', async () => {
    const app = await buildTestApp(async (input) => {
      checkCalls.push({ text: input.text, language: input.language });
      return [A_MATCH];
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'Bonjour madame' },
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { matches: [A_MATCH] });
    assert.equal(checkCalls[0].text, 'Bonjour madame');
    assert.equal(checkCalls[0].language, 'fr-FR');
    await app.close();
  });

  it('rejette avec 400 un texte vide', async () => {
    const app = await buildTestApp(async () => []);

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: '' },
    });

    assert.equal(res.statusCode, 400);
    await app.close();
  });

  it('rejette avec 400 un texte absent', async () => {
    const app = await buildTestApp(async () => []);

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: {},
    });

    assert.equal(res.statusCode, 400);
    await app.close();
  });

  it('rejette avec 400 un texte trop long', async () => {
    const app = await buildTestApp(async () => []);

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'a'.repeat(20001) },
    });

    assert.equal(res.statusCode, 400);
    await app.close();
  });

  it('rejette avec 400 une langue inconnue', async () => {
    const app = await buildTestApp(async () => []);

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'Bonjour', language: 'klingon' },
    });

    assert.equal(res.statusCode, 400);
    await app.close();
  });

  it('retourne 502 quand LanguageTool est indisponible', async () => {
    const app = await buildTestApp(async () => {
      throw new LanguageToolUnavailableError();
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'Bonjour' },
    });

    assert.equal(res.statusCode, 502);
    assert.ok(res.json().error);
    await app.close();
  });

  it('transmet la langue fournie au service', async () => {
    const app = await buildTestApp(async (input) => {
      checkCalls.push({ text: input.text, language: input.language });
      return [];
    });

    await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'Hello', language: 'en-US' },
    });

    assert.equal(checkCalls[0].language, 'en-US');
    await app.close();
  });

  it('enregistre la route via grammarRoutes (factory Fastify)', async () => {
    const app = Fastify({ logger: false });
    app.decorate('authenticate', async () => {});
    await app.register(grammarRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/grammar/check',
      payload: { text: 'x'.repeat(20001) },
    });

    assert.equal(res.statusCode, 400);
    await app.close();
  });
});
