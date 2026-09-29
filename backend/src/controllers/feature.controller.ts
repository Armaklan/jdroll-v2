import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ListFeaturesUseCase, listFeaturesUseCase } from '../usecases/feature/list-features.usecase.js';
import { UpdateFeatureUseCase, updateFeatureUseCase } from '../usecases/feature/update-feature.usecase.js';
import { DomainError, FeatureNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

const featureNameParamsSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateFeatureBodySchema = z.object({
  enabled: z.boolean(),
});

export class FeatureController {
  constructor(
    private readonly listUseCase: ListFeaturesUseCase = listFeaturesUseCase,
    private readonly updateUseCase: UpdateFeatureUseCase = updateFeatureUseCase
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof FeatureNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }

  /**
   * GET /api/features
   * Liste des feature flips (authentifié)
   */
  async listFeatures(request: FastifyRequest, reply: FastifyReply) {
    try {
      const features = await this.listUseCase.execute();
      return reply.status(200).send({ features });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/features/:name
   * Active ou désactive un feature flip (réservé aux administrateurs)
   */
  async updateFeature(request: FastifyRequest, reply: FastifyReply) {
    const paramsResult = featureNameParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: 'Nom de feature invalide',
        details: paramsResult.error.format(),
      });
    }

    const bodyResult = updateFeatureBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Corps de requête invalide',
        details: bodyResult.error.format(),
      });
    }

    try {
      const feature = await this.updateUseCase.execute({
        requesterProfil: request.user.profil,
        name: paramsResult.data.name,
        enabled: bodyResult.data.enabled,
      });
      return reply.status(200).send({ feature });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/features', { preHandler: [app.authenticate] }, (req, rep) =>
      this.listFeatures(req, rep)
    );
    app.put('/api/features/:name', { preHandler: [app.authenticate] }, (req, rep) =>
      this.updateFeature(req, rep)
    );
  }
}

export const featureController = new FeatureController();

export async function featureRoutes(app: FastifyInstance) {
  featureController.registerRoutes(app);
}
