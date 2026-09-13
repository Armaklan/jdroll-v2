import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { campaignQueries, CampaignQueries } from '../queries/campaign.queries.js';
import { forumQueries, ForumQueries } from '../queries/forum.queries.js';
import { JWTPayload } from '../types/index.js';
import { CampaignNotFoundError, TopicNotFoundError } from '../errors/domain.errors.js';

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

const getCampaignForumParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const getTopicPostsParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const getTopicPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
});

export class CampaignController {
  constructor(
    private readonly campaignQueryService: CampaignQueries = campaignQueries,
    private readonly forumQueryService: ForumQueries = forumQueries
  ) {}

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
   * GET /api/campaigns/:id/forum
   * Récupère le forum d'une campagne avec ses sections et topics (et l'état de lecture selon l'utilisateur)
   */
  async getCampaignForum(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignForumParamsSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    const { id: campaignId } = parseResult.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.forumQueryService.getCampaignForum(campaignId, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération du forum de la campagne' });
    }
  }

  /**
   * GET /api/topics/:id
   * Récupère les messages d'un topic avec pagination et détection automatique de la page du dernier message lu
   */
  async getTopicPosts(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getTopicPostsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const parseQuery = getTopicPostsQuerySchema.safeParse(request.query);
    if (!parseQuery.success) {
      return reply.status(400).send({
        error: 'Paramètre de page invalide',
        details: parseQuery.error.format(),
      });
    }

    const { id: topicId } = parseParams.data;
    const { page } = parseQuery.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.forumQueryService.getTopicPosts(topicId, page, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des messages du sujet' });
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

    // Route pour voir le forum d'une campagne (accessible public avec statut de lecture si connecté)
    app.get('/api/campaigns/:id/forum', (req, rep) => this.getCampaignForum(req, rep));

    // Route pour voir les messages d'un sujet (accessible public avec statut de lecture si connecté)
    app.get('/api/topics/:id', (req, rep) => this.getTopicPosts(req, rep));
    app.get('/api/campaigns/:campaignId/topics/:id', (req, rep) => this.getTopicPosts(req, rep));
  }
}

export const campaignController = new CampaignController();

export async function campaignRoutes(app: FastifyInstance) {
  campaignController.registerRoutes(app);
}
