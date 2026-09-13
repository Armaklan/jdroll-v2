import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { campaignQueries, CampaignQueries } from '../queries/campaign.queries.js';
import { JWTPayload } from '../types/index.js';

const getMyCampaignsSchema = z.object({
  role: z.enum(['master', 'player']).default('master'),
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),
});

const getAllCampaignsSchema = z.object({
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),
  search: z.string().optional(),
});

export class CampaignController {
  constructor(private readonly campaignQueryService: CampaignQueries = campaignQueries) {}

  /**
   * GET /api/campaigns/mine
   * Récupère la liste des campagnes de l'utilisateur connecté (maîtrisées ou joueur, avec ou sans archivées)
   */
  async getMyCampaigns(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = getMyCampaignsSchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètres de requête invalides',
        details: parseResult.error.format(),
      });
    }

    const { role, includeArchived } = parseResult.data;

    try {
      const campaigns = await this.campaignQueryService.getMyCampaigns(user.id, role, includeArchived);
      return reply.status(200).send({ campaigns });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des campagnes' });
    }
  }

  /**
   * GET /api/campaigns
   * Récupère toutes les campagnes avec filtre d'archive et recherche textuelle
   */
  async getAllCampaigns(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getAllCampaignsSchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètres de requête invalides',
        details: parseResult.error.format(),
      });
    }

    const { includeArchived, search } = parseResult.data;

    try {
      const campaigns = await this.campaignQueryService.getAllCampaigns(includeArchived, search);
      return reply.status(200).send({ campaigns });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des campagnes' });
    }
  }

  /**
   * Déclaration des routes du contrôleur
   */
  registerRoutes(app: FastifyInstance) {
    // Route publique pour voir toutes les campagnes
    app.get('/api/campaigns', (req, rep) => this.getAllCampaigns(req, rep));

    // Route authentifiée pour voir ses propres campagnes
    app.get(
      '/api/campaigns/mine',
      { preHandler: [app.authenticate] },
      (req, rep) => this.getMyCampaigns(req, rep)
    );
  }
}

export const campaignController = new CampaignController();

export async function campaignRoutes(app: FastifyInstance) {
  campaignController.registerRoutes(app);
}
