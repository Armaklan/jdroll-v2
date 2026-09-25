import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { homeQueries, HomeQueries } from '../queries/home.queries.js';
import { DomainError } from '../errors/domain.errors.js';

export class HomeController {
  constructor(
    private readonly queries: HomeQueries = homeQueries
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }

  async getCommunityStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.queries.getCommunityStats();
      return reply.status(200).send({ stats });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/home/stats', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getCommunityStats(req, rep)
    );
  }
}

export const homeController = new HomeController();

export async function homeRoutes(app: FastifyInstance) {
  homeController.registerRoutes(app);
}
