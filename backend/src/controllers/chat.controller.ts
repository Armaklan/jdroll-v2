import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { chatQueries, ChatQueries } from '../queries/chat.queries.js';
import {
  sendChatMessageUseCase,
  SendChatMessageUseCase,
} from '../usecases/chat/send-chat-message.usecase.js';
import {
  deleteChatMessageUseCase,
  DeleteChatMessageUseCase,
} from '../usecases/chat/delete-chat-message.usecase.js';
import {
  clearChatUseCase,
  ClearChatUseCase,
} from '../usecases/chat/clear-chat.usecase.js';
import {
  chatWebSocketService,
  ChatWebSocketService,
} from '../services/chat-websocket.service.js';
import {
  DomainError,
  ValidationError,
  UserNotFoundError,
  ForbiddenError,
} from '../errors/domain.errors.js';
import { JWTPayload } from '../types/index.js';

const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

const sendMessageBodySchema = z.object({
  message: z.string().min(1, 'Le message ne peut pas être vide'),
  to: z.string().optional().nullable(),
  to_username: z.string().optional().nullable(),
});

const searchUsersQuerySchema = z.object({
  q: z.string().optional().default(''),
});

const messageIdParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export class ChatController {
  constructor(
    private readonly queries: ChatQueries = chatQueries,
    private readonly sendUseCase: SendChatMessageUseCase = sendChatMessageUseCase,
    private readonly deleteUseCase: DeleteChatMessageUseCase = deleteChatMessageUseCase,
    private readonly clearUseCase: ClearChatUseCase = clearChatUseCase,
    private readonly wsService: ChatWebSocketService = chatWebSocketService
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.message, details: error.details });
    }
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

  async getRecentMessages(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getMessagesQuerySchema.safeParse(request.query);
    const limit = parseResult.success ? parseResult.data.limit : 200;

    let user: JWTPayload | undefined;
    try {
      await request.jwtVerify();
      user = request.user as JWTPayload;
    } catch {
      // Utilisateur non connecté / invité : seuls les messages publics sont visibles
    }

    try {
      const messages = user
        ? await this.queries.getRecentMessages(user.id, user.username, limit)
        : await this.queries.getPublicRecentMessages(limit);
      return reply.status(200).send({ messages });
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
      const message = await this.sendUseCase.execute({
        userId: user.id,
        username: user.username,
        message: parseResult.data.message,
        to: parseResult.data.to,
        to_username: parseResult.data.to_username,
      });

      this.wsService.broadcastChatMessage(message);
      return reply.status(201).send({ message });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteMessage(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = messageIdParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de message invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const result = await this.deleteUseCase.execute({
        messageId: parseResult.data.id,
        userId: user.id,
        userProfil: user.profil,
      });

      this.wsService.broadcastChatMessageDeleted(result.deletedMessageId);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async clearChat(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;

    try {
      const result = await this.clearUseCase.execute({
        userId: user.id,
        userProfil: user.profil,
      });

      this.wsService.broadcastChatCleared();
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async getOnlineUsers(request: FastifyRequest, reply: FastifyReply) {
    const users = this.wsService.getOnlineUsers();
    return reply.status(200).send({ users });
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
      const users = await this.queries.searchUsers(parseResult.data.q, user.id);
      return reply.status(200).send({ users });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/chat/messages', (req, rep) =>
      this.getRecentMessages(req, rep)
    );

    app.post('/api/chat/messages', { preHandler: [app.authenticate] }, (req, rep) =>
      this.sendMessage(req, rep)
    );

    app.delete('/api/chat/messages/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteMessage(req, rep)
    );

    app.delete('/api/chat/messages', { preHandler: [app.authenticate] }, (req, rep) =>
      this.clearChat(req, rep)
    );

    app.get('/api/chat/users/online', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getOnlineUsers(req, rep)
    );

    app.get('/api/chat/users/search', { preHandler: [app.authenticate] }, (req, rep) =>
      this.searchUsers(req, rep)
    );

    app.get('/api/chat/ws', { websocket: true }, (socket, req) => {
      // Extract token from query or Authorization header
      const queryToken = (req.query as any)?.token;
      const headerAuth = req.headers.authorization;
      const token = queryToken || (headerAuth?.startsWith('Bearer ') ? headerAuth.slice(7) : null);

      if (!token) {
        socket.close(4001, 'Unauthorized: token manquant');
        return;
      }

      try {
        const decoded = app.jwt.verify<JWTPayload>(token);
        this.wsService.handleConnection(socket, decoded);
      } catch (err) {
        socket.close(4001, 'Unauthorized: token invalide');
      }
    });
  }
}

export const chatController = new ChatController();

export async function chatRoutes(app: FastifyInstance) {
  chatController.registerRoutes(app);
}
