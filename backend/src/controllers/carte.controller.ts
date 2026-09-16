import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { carteQueries, CarteQueries } from '../queries/carte.queries.js';
import { createCarteUseCase, CreateCarteUseCase } from '../usecases/carte/create-carte.usecase.js';
import { updateCarteUseCase, UpdateCarteUseCase } from '../usecases/carte/update-carte.usecase.js';
import { deleteCarteUseCase, DeleteCarteUseCase } from '../usecases/carte/delete-carte.usecase.js';
import { diskFileStorage, IFileStorage } from '../storage/file-storage.js';
import { JWTPayload } from '../types/index.js';
import {
  CampaignNotFoundError,
  CarteNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../errors/domain.errors.js';

const campaignParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const carteCampaignParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  carteId: z.coerce.number().int().positive(),
});

const carteDirectParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createCarteBodySchema = z.object({
  name: z.string().min(1, 'Le nom de la carte est requis'),
  description: z.string().optional().default(''),
  image: z.string().min(1, "L'image de la carte est requise"),
  published: z.boolean().optional().default(true),
  config: z.any().optional(),
});

const updateCarteBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  published: z.boolean().optional(),
  config: z.any().optional(),
});

export class CarteController {
  constructor(
    private readonly carteQueryService: CarteQueries = carteQueries,
    private readonly createCarteUseCaseService: CreateCarteUseCase = createCarteUseCase,
    private readonly updateCarteUseCaseService: UpdateCarteUseCase = updateCarteUseCase,
    private readonly deleteCarteUseCaseService: DeleteCarteUseCase = deleteCarteUseCase,
    private readonly fileStorageService: IFileStorage = diskFileStorage
  ) {}

  /**
   * GET /api/campaigns/:id/cartes
   */
  async getCampaignCartes(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = campaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur anonyme
    }

    try {
      const cartes = await this.carteQueryService.getCampaignCartes(
        parseParams.data.id,
        userId
      );
      return reply.status(200).send(cartes);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des cartes' });
    }
  }

  /**
   * GET /api/campaigns/:id/cartes/:carteId ou GET /api/cartes/:id
   */
  async getCarte(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as any;
    const carteId = params.carteId !== undefined ? Number(params.carteId) : Number(params.id);

    if (isNaN(carteId) || carteId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de carte invalide' });
    }

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur anonyme
    }

    try {
      const carte = await this.carteQueryService.getCarteById(carteId, userId);
      return reply.status(200).send(carte);
    } catch (error) {
      if (error instanceof CarteNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération de la carte' });
    }
  }

  /**
   * POST /api/campaigns/:id/cartes
   */
  async createCarte(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = campaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createCarteBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de carte invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.createCarteUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
        name: parseBody.data.name,
        description: parseBody.data.description,
        image: parseBody.data.image,
        published: parseBody.data.published,
        config: parseBody.data.config,
      });

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création de la carte' });
    }
  }

  /**
   * PUT/PATCH /api/campaigns/:id/cartes/:carteId ou /api/cartes/:id
   */
  async updateCarte(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as any;
    const carteId = params.carteId !== undefined ? Number(params.carteId) : Number(params.id);

    if (isNaN(carteId) || carteId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de carte invalide' });
    }

    const parseBody = updateCarteBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de mise à jour invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      await this.updateCarteUseCaseService.execute({
        carteId,
        userId: user.id,
        name: parseBody.data.name,
        description: parseBody.data.description,
        image: parseBody.data.image,
        published: parseBody.data.published,
        config: parseBody.data.config,
      });

      return reply.status(200).send({ success: true });
    } catch (error) {
      if (error instanceof CarteNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la modification de la carte' });
    }
  }

  /**
   * DELETE /api/campaigns/:id/cartes/:carteId ou /api/cartes/:id
   */
  async deleteCarte(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as any;
    const carteId = params.carteId !== undefined ? Number(params.carteId) : Number(params.id);

    if (isNaN(carteId) || carteId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de carte invalide' });
    }

    const user = request.user as JWTPayload;

    try {
      await this.deleteCarteUseCaseService.execute({
        carteId,
        userId: user.id,
      });

      return reply.status(200).send({ success: true });
    } catch (error) {
      if (error instanceof CarteNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression de la carte' });
    }
  }

  /**
   * POST /api/campaigns/:id/cartes/upload-image
   */
  async uploadCarteImage(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = campaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({ error: 'Identifiant de campagne invalide' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'Fichier requis' });
      }

      const buffer = await data.toBuffer();
      const ext = data.filename.split('.').pop() || 'png';
      const filename = `carte_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const fileUrl = await this.fileStorageService.saveCampaignFile(
        parseParams.data.id,
        filename,
        buffer
      );

      return reply.status(200).send({ url: fileUrl });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: "Erreur lors du téléversement de l'image" });
    }
  }

  registerRoutes(app: FastifyInstance) {
    // Lecture des cartes de la campagne
    app.get('/api/campaigns/:id/cartes', (req, rep) => this.getCampaignCartes(req, rep));

    // Lecture d'une carte spécifique
    app.get('/api/campaigns/:id/cartes/:carteId', (req, rep) => this.getCarte(req, rep));
    app.get('/api/cartes/:id', (req, rep) => this.getCarte(req, rep));

    // Création de carte (MJ)
    app.post(
      '/api/campaigns/:id/cartes',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createCarte(req, rep)
    );

    // Téléversement d'image de carte
    app.post(
      '/api/campaigns/:id/cartes/upload-image',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadCarteImage(req, rep)
    );

    // Modification d'une carte
    app.put(
      '/api/campaigns/:id/cartes/:carteId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCarte(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/cartes/:carteId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCarte(req, rep)
    );
    app.put(
      '/api/cartes/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCarte(req, rep)
    );
    app.patch(
      '/api/cartes/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCarte(req, rep)
    );

    // Suppression d'une carte (MJ)
    app.delete(
      '/api/campaigns/:id/cartes/:carteId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteCarte(req, rep)
    );
    app.delete(
      '/api/cartes/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteCarte(req, rep)
    );
  }
}

export const carteController = new CarteController();

export async function carteRoutes(app: FastifyInstance) {
  carteController.registerRoutes(app);
}
