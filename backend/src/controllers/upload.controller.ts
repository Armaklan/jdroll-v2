import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { uploadEditorImageUseCase, UploadEditorImageUseCase } from '../usecases/auth/upload-editor-image.usecase.js';
import { DomainError, UserNotFoundError } from '../errors/domain.errors.js';
import { JWTPayload } from '../types/index.js';

export class UploadController {
  constructor(private readonly uploadEditorImageUC: UploadEditorImageUseCase = uploadEditorImageUseCase) {}

  /**
   * POST /api/uploads/image
   * Téléverser une image pour l'éditeur Wysiwyg (stockée dans files/editor/<userId>/)
   */
  async uploadEditorImage(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;

    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const buffer = await file.toBuffer();
      const result = await this.uploadEditorImageUC.execute({
        userId: userPayload.id,
        filename: file.filename,
        mimetype: file.mimetype,
        content: buffer,
      });

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }

    // Erreur inattendue
    throw error;
  }

  registerRoutes(app: FastifyInstance) {
    app.post('/api/uploads/image', { preHandler: [app.authenticate] }, (req, rep) =>
      this.uploadEditorImage(req, rep)
    );
  }
}

export const uploadController = new UploadController();

export async function uploadRoutes(app: FastifyInstance) {
  uploadController.registerRoutes(app);
}
