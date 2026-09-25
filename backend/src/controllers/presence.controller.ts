import { FastifyInstance } from 'fastify';
import { JWTPayload } from '../types/index.js';
import {
  presenceWebSocketService,
  PresenceWebSocketService,
} from '../services/presence-websocket.service.js';

export class PresenceController {
  constructor(
    private readonly wsService: PresenceWebSocketService = presenceWebSocketService
  ) {}

  registerRoutes(app: FastifyInstance) {
    app.get('/api/presence/ws', { websocket: true }, (socket, req) => {
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

export const presenceController = new PresenceController();

export async function presenceRoutes(app: FastifyInstance) {
  presenceController.registerRoutes(app);
}
