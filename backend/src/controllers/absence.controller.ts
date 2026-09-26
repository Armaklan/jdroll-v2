import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { absenceQueries, AbsenceQueries } from '../queries/absence.queries.js';
import {
  declareAbsenceUseCase,
  DeclareAbsenceUseCase,
} from '../usecases/absence/declare-absence.usecase.js';
import {
  updateAbsenceUseCase,
  UpdateAbsenceUseCase,
} from '../usecases/absence/update-absence.usecase.js';
import {
  deleteAbsenceUseCase,
  DeleteAbsenceUseCase,
} from '../usecases/absence/delete-absence.usecase.js';
import {
  DomainError,
  ValidationError,
  ForbiddenError,
  AbsenceNotFoundError,
} from '../errors/domain.errors.js';
import { JWTPayload } from '../types/index.js';

const declareAbsenceBodySchema = z.object({
  beginDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  commentaire: z.string().min(1, 'Le commentaire est requis').max(200, 'Le commentaire ne peut pas dépasser 200 caractères'),
});

const absenceIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export class AbsenceController {
  constructor(
    private readonly queries: AbsenceQueries = absenceQueries,
    private readonly declareUseCase: DeclareAbsenceUseCase = declareAbsenceUseCase,
    private readonly updateUseCase: UpdateAbsenceUseCase = updateAbsenceUseCase,
    private readonly deleteUseCase: DeleteAbsenceUseCase = deleteAbsenceUseCase
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.message, details: error.details });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ error: error.message });
    }
    if (error instanceof AbsenceNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }

  private parseBodyOrReply(body: unknown, reply: FastifyReply): z.infer<typeof declareAbsenceBodySchema> | null {
    const parsed = declareAbsenceBodySchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      reply.status(400).send({ error: first?.message || 'Données invalides' });
      return null;
    }
    return parsed.data;
  }

  async getMyAbsences(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const absences = await this.queries.getMyAbsences(user.id);
      return reply.status(200).send({ absences });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async declareAbsence(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const body = this.parseBodyOrReply(request.body, reply);
    if (!body) {
      return reply;
    }

    try {
      const absence = await this.declareUseCase.execute({
        userId: user.id,
        beginDate: body.beginDate,
        endDate: body.endDate,
        commentaire: body.commentaire,
      });
      return reply.status(201).send({ absence });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async updateAbsence(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const params = absenceIdParamsSchema.parse(request.params);
    const body = this.parseBodyOrReply(request.body, reply);
    if (!body) {
      return reply;
    }

    try {
      const absence = await this.updateUseCase.execute({
        absenceId: params.id,
        userId: user.id,
        beginDate: body.beginDate,
        endDate: body.endDate,
        commentaire: body.commentaire,
      });
      return reply.status(200).send({ absence });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteAbsence(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const params = absenceIdParamsSchema.parse(request.params);
    try {
      await this.deleteUseCase.execute({ absenceId: params.id, userId: user.id });
      return reply.status(200).send({ success: true });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/absences', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getMyAbsences(req, rep)
    );
    app.post('/api/absences', { preHandler: [app.authenticate] }, (req, rep) =>
      this.declareAbsence(req, rep)
    );
    app.put('/api/absences/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.updateAbsence(req, rep)
    );
    app.delete('/api/absences/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteAbsence(req, rep)
    );
  }
}

export const absenceController = new AbsenceController();

export async function absenceRoutes(app: FastifyInstance) {
  absenceController.registerRoutes(app);
}
