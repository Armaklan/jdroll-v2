import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AnnonceQueries, annonceQueries } from '../queries/annonce.queries.js';
import { CreateAnnonceUseCase, createAnnonceUseCase } from '../usecases/annonce/create-annonce.usecase.js';
import { UpdateAnnonceUseCase, updateAnnonceUseCase } from '../usecases/annonce/update-annonce.usecase.js';
import { DeleteAnnonceUseCase, deleteAnnonceUseCase } from '../usecases/annonce/delete-annonce.usecase.js';
import { ListAnnoncesUseCase, listAnnoncesUseCase } from '../usecases/annonce/list-annonces.usecase.js';
import { AnnonceNotFoundError, DomainError, ForbiddenError } from '../errors/domain.errors.js';

const annonceIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const annonceBodySchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(500),
  content: z.string().min(1, 'Le contenu est obligatoire'),
  endDate: z.string().min(10, 'La date de fin est obligatoire'),
});

/**
 * Normalise une date reçue du client ("2026-10-05T12:00" ou "2026-10-05 12:00:00")
 * vers le format MySQL "YYYY-MM-DD HH:mm[:ss]".
 */
function normalizeEndDate(endDate: string): string {
  return endDate.trim().replace('T', ' ');
}

export class AnnonceController {
  constructor(
    private readonly queries: AnnonceQueries = annonceQueries,
    private readonly createUseCase: CreateAnnonceUseCase = createAnnonceUseCase,
    private readonly updateUseCase: UpdateAnnonceUseCase = updateAnnonceUseCase,
    private readonly deleteUseCase: DeleteAnnonceUseCase = deleteAnnonceUseCase,
    private readonly listUseCase: ListAnnoncesUseCase = listAnnoncesUseCase
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof AnnonceNotFoundError) {
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
   * GET /api/annonces/visible
   * Annonces dont la fenêtre create_date / end_date couvre l'instant présent (authentifié).
   */
  async getVisibleAnnonces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const annonces = await this.queries.getVisibleAnnonces();
      return reply.status(200).send({ annonces });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * GET /api/annonces
   * Liste complète des annonces, réservée à l'écran d'administration (admin).
   */
  async listAnnonces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const annonces = await this.listUseCase.execute({
        requesterProfil: request.user.profil,
      });
      return reply.status(200).send({ annonces });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * POST /api/annonces
   * Crée une annonce (admin).
   */
  async createAnnonce(request: FastifyRequest, reply: FastifyReply) {
    const bodyResult = annonceBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Corps de requête invalide',
        details: bodyResult.error.format(),
      });
    }

    try {
      const annonce = await this.createUseCase.execute({
        requesterProfil: request.user.profil,
        title: bodyResult.data.title,
        content: bodyResult.data.content,
        endDate: normalizeEndDate(bodyResult.data.endDate),
      });
      return reply.status(201).send({ annonce });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/annonces/:id
   * Modifie une annonce (admin).
   */
  async updateAnnonce(request: FastifyRequest, reply: FastifyReply) {
    const paramsResult = annonceIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: 'Identifiant d\'annonce invalide',
        details: paramsResult.error.format(),
      });
    }

    const bodyResult = annonceBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Corps de requête invalide',
        details: bodyResult.error.format(),
      });
    }

    try {
      const annonce = await this.updateUseCase.execute({
        requesterProfil: request.user.profil,
        id: paramsResult.data.id,
        title: bodyResult.data.title,
        content: bodyResult.data.content,
        endDate: normalizeEndDate(bodyResult.data.endDate),
      });
      return reply.status(200).send({ annonce });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * DELETE /api/annonces/:id
   * Supprime une annonce (admin).
   */
  async deleteAnnonce(request: FastifyRequest, reply: FastifyReply) {
    const paramsResult = annonceIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        error: 'Identifiant d\'annonce invalide',
        details: paramsResult.error.format(),
      });
    }

    try {
      await this.deleteUseCase.execute({
        requesterProfil: request.user.profil,
        id: paramsResult.data.id,
      });
      return reply.status(204).send();
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/annonces/visible', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getVisibleAnnonces(req, rep)
    );
    app.get('/api/annonces', { preHandler: [app.authenticate] }, (req, rep) =>
      this.listAnnonces(req, rep)
    );
    app.post('/api/annonces', { preHandler: [app.authenticate] }, (req, rep) =>
      this.createAnnonce(req, rep)
    );
    app.put('/api/annonces/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.updateAnnonce(req, rep)
    );
    app.delete('/api/annonces/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteAnnonce(req, rep)
    );
  }
}

export const annonceController = new AnnonceController();

export async function annonceRoutes(app: FastifyInstance) {
  annonceController.registerRoutes(app);
}
