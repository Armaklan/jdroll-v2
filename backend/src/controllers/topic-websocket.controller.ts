import { FastifyInstance } from 'fastify';
import { JWTPayload } from '../types/index.js';
import {
  topicWebSocketService,
  TopicWebSocketService,
} from '../services/topic-websocket.service.js';

export class TopicWebSocketController {
  constructor(
    private readonly wsService: TopicWebSocketService = topicWebSocketService
  ) {}

  registerRoutes(app: FastifyInstance) {
    app.get('/api/topics/ws', { websocket: true }, (socket, req) => {
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
        this.wsService.register();
        this.wsService.handleConnection(socket, decoded);
      } catch (err) {
        socket.close(4001, 'Unauthorized: token invalide');
      }
    });
  }
}

export const topicWebSocketController = new TopicWebSocketController();

export async function topicWebSocketRoutes(app: FastifyInstance) {
  topicWebSocketController.registerRoutes(app);
}
