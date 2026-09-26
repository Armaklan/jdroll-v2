import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { userQueries, UserQueries } from '../queries/user.queries.js';
import { DomainError, UserNotFoundError } from '../errors/domain.errors.js';

const userIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export class UserController {
  constructor(
    private readonly userQueryService: UserQueries = userQueries
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message });
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

  registerRoutes(app: FastifyInstance) {
    app.get('/api/users/:userId/profile', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getPublicProfile(req, rep)
    );
  }
}

export const userController = new UserController();

export async function userRoutes(app: FastifyInstance) {
  userController.registerRoutes(app);
}
