import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  checkGrammar,
  DEFAULT_GRAMMAR_LANGUAGE,
  GRAMMAR_LANGUAGES,
  MAX_GRAMMAR_TEXT_LENGTH,
  LanguageToolUnavailableError,
} from '../services/languagetool.service.js';

const checkBodySchema = z.object({
  text: z.string().min(1).max(MAX_GRAMMAR_TEXT_LENGTH),
  language: z.enum(GRAMMAR_LANGUAGES).optional(),
});

export class GrammarController {
  constructor(
    private readonly check: typeof checkGrammar = checkGrammar
  ) {}

  /**
   * POST /api/grammar/check
   * Vérifie la grammaire d'un texte (authentifié)
   */
  async checkGrammar(request: FastifyRequest, reply: FastifyReply) {
    const bodyResult = checkBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Corps de requête invalide',
        details: bodyResult.error.format(),
      });
    }

    try {
      const matches = await this.check({
        text: bodyResult.data.text,
        language: bodyResult.data.language ?? DEFAULT_GRAMMAR_LANGUAGE,
      });
      return reply.status(200).send({ matches });
    } catch (error) {
      if (error instanceof LanguageToolUnavailableError) {
        return reply.status(502).send({ error: error.message });
      }
      throw error;
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.post('/api/grammar/check', { preHandler: [app.authenticate] }, (req, rep) =>
      this.checkGrammar(req, rep)
    );
  }
}

export const grammarController = new GrammarController();

export async function grammarRoutes(app: FastifyInstance) {
  grammarController.registerRoutes(app);
}
