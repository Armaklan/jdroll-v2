import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { messageQueries, MessageQueries } from '../queries/message.queries.js';
import {
  sendMessageUseCase,
  SendMessageUseCase,
} from '../usecases/message/send-message.usecase.js';
import {
  deleteMessageUseCase,
  DeleteMessageUseCase,
} from '../usecases/message/delete-message.usecase.js';
import {
  DomainError,
  ValidationError,
  ForbiddenError,
  MessageNotFoundError,
} from '../errors/domain.errors.js';
import { JWTPayload } from '../types/index.js';

const messageIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const sendMessageBodySchema = z.object({
  title: z.string().min(1, 'Le sujet est requis').max(200, 'Le sujet est trop long'),
  content: z.string().min(1, 'Le message ne peut pas être vide'),
  recipients: z.array(z.string().min(1)).min(1, 'Au moins un destinataire est requis'),
});

const searchUsersQuerySchema = z.object({
  q: z.string().optional().default(''),
});

export class MessageController {
  constructor(
    private readonly msgQueries: MessageQueries = messageQueries,
    private readonly sendUseCase: SendMessageUseCase = sendMessageUseCase,
    private readonly deleteUseCase: DeleteMessageUseCase = deleteMessageUseCase
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.message, details: error.details });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({ error: error.message });
    }
    if (error instanceof MessageNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }

  async getInbox(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const result = await this.msgQueries.getInbox(user.id);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getSent(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const result = await this.msgQueries.getSent(user.id);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const unreadCount = await this.msgQueries.getUnreadCount(user.id);
      return reply.status(200).send({ unreadCount });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async searchUsers(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = searchUsersQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètre de recherche invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const users = await this.msgQueries.searchUsers(parseResult.data.q, user.id);
      return reply.status(200).send({ users });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getMessageDetail(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = messageIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de message invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const message = await this.msgQueries.getMessageDetail(parseResult.data.id, user.id);
      return reply.status(200).send({ message });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = sendMessageBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données de message invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await this.sendUseCase.execute({
        fromId: user.id,
        fromUsername: user.username,
        title: parseResult.data.title,
        content: parseResult.data.content,
        recipients: parseResult.data.recipients,
      });
      return reply.status(201).send({ success: true, ...result });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteFromInbox(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = messageIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const success = await this.deleteUseCase.execute({
        messageId: parseResult.data.id,
        userId: user.id,
        box: 'inbox',
      });
      return reply.status(200).send({ success });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteFromSent(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = messageIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const success = await this.deleteUseCase.execute({
        messageId: parseResult.data.id,
        userId: user.id,
        box: 'sent',
      });
      return reply.status(200).send({ success });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/messages/inbox', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getInbox(req, rep)
    );
    app.get('/api/messages/sent', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getSent(req, rep)
    );
    app.get('/api/messages/unread-count', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getUnreadCount(req, rep)
    );
    app.get('/api/messages/users', { preHandler: [app.authenticate] }, (req, rep) =>
      this.searchUsers(req, rep)
    );
    app.get('/api/messages/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getMessageDetail(req, rep)
    );
    app.post('/api/messages', { preHandler: [app.authenticate] }, (req, rep) =>
      this.sendMessage(req, rep)
    );
    app.delete('/api/messages/inbox/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteFromInbox(req, rep)
    );
    app.delete('/api/messages/sent/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteFromSent(req, rep)
    );
  }
}

export const messageController = new MessageController();

export async function messageRoutes(app: FastifyInstance) {
  messageController.registerRoutes(app);
}
