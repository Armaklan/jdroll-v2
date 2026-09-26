import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { userQueries, UserQueries } from '../queries/user.queries.js';
import {
  assignUserTitleUseCase,
  AssignUserTitleUseCase,
} from '../usecases/user/assign-user-title.usecase.js';
import { DomainError, ForbiddenError, UserNotFoundError } from '../errors/domain.errors.js';

const userIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const assignTitleBodySchema = z.object({
  titre: z.string(),
});

export class UserController {
  constructor(
    private readonly userQueryService: UserQueries = userQueries,
    private readonly assignTitleUseCase: AssignUserTitleUseCase = assignUserTitleUseCase
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof UserNotFoundError) {
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
   * GET /api/users/:userId/profile
   * Consultation du profil public d'un utilisateur (authentifié)
   */
  async getPublicProfile(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = userIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const profile = await this.userQueryService.getPublicProfile(parseResult.data.userId);
      return reply.status(200).send({ profile });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/users/:userId/titre
   * Affecte un titre à un utilisateur (réservé aux administrateurs)
   */
  async assignTitle(request: FastifyRequest, reply: FastifyReply) {
    const paramsResult = userIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: 'Identifiant invalide',
        details: paramsResult.error.format(),
      });
    }

    const bodyResult = assignTitleBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Corps de requête invalide',
        details: bodyResult.error.format(),
      });
    }

    try {
      const user = await this.assignTitleUseCase.execute({
        requesterProfil: request.user.profil,
        userId: paramsResult.data.userId,
        titre: bodyResult.data.titre,
      });
      return reply.status(200).send({ user: { id: user.id, username: user.username, titre: user.titre } });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/users/:userId/profile', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getPublicProfile(req, rep)
    );
    app.put('/api/users/:userId/titre', { preHandler: [app.authenticate] }, (req, rep) =>
      this.assignTitle(req, rep)
    );
  }
}

export const userController = new UserController();

export async function userRoutes(app: FastifyInstance) {
  userController.registerRoutes(app);
}
