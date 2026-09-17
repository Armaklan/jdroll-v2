import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { notificationQueries, NotificationQueries } from '../queries/notification.queries.js';
import {
  deleteNotificationUseCase,
  DeleteNotificationUseCase,
} from '../usecases/notification/delete-notification.usecase.js';
import {
  deleteAllNotificationsUseCase,
  DeleteAllNotificationsUseCase,
} from '../usecases/notification/delete-all-notifications.usecase.js';
import {
  notificationWebSocketService,
  INotificationWebSocketService,
} from '../services/notification-websocket.service.js';
import { DomainError, ValidationError } from '../errors/domain.errors.js';
import { JWTPayload } from '../types/index.js';

const deleteNotificationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export class NotificationController {
  constructor(
    private readonly notifQueries: NotificationQueries = notificationQueries,
    private readonly deleteUseCase: DeleteNotificationUseCase = deleteNotificationUseCase,
    private readonly deleteAllUseCase: DeleteAllNotificationsUseCase = deleteAllNotificationsUseCase,
    private readonly wsService: INotificationWebSocketService = notificationWebSocketService
  ) {}

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }
    throw error;
  }

  async getNotifications(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const result = await this.notifQueries.getUserNotifications(user.id);
      return reply.status(200).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteNotification(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = deleteNotificationParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant invalide',
        details: parseResult.error.format(),
      });
    }

    try {
      const deleted = await this.deleteUseCase.execute({
        notificationId: parseResult.data.id,
        userId: user.id,
      });
      return reply.status(200).send({ success: deleted });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  async deleteAllNotifications(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    try {
      const count = await this.deleteAllUseCase.execute({
        userId: user.id,
      });
      return reply.status(200).send({ success: true, count });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  registerRoutes(app: FastifyInstance) {
    app.get('/api/notifications', { preHandler: [app.authenticate] }, (req, rep) =>
      this.getNotifications(req, rep)
    );
    app.delete('/api/notifications/:id', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteNotification(req, rep)
    );
    app.delete('/api/notifications', { preHandler: [app.authenticate] }, (req, rep) =>
      this.deleteAllNotifications(req, rep)
    );

    app.get('/api/notifications/ws', { websocket: true }, (socket, req) => {
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

export const notificationController = new NotificationController();

export async function notificationRoutes(app: FastifyInstance) {
  notificationController.registerRoutes(app);
}
