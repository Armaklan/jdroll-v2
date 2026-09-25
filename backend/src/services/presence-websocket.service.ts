import { WebSocket } from 'ws';
import { ChatConnectedUser, JWTPayload } from '../types/index.js';

interface ConnectedClient {
  socket: WebSocket;
  user: JWTPayload;
}

/**
 * Salon WebSocket dédié à la présence sur le site : chaque visiteur authentifié
 * ouvre une connexion qui l'enregistre comme "en ligne". Les connexions et
 * déconnexions sont rediffusées en direct à tous les clients connectés.
 */
export class PresenceWebSocketService {
  private clients = new Set<ConnectedClient>();

  async handleConnection(socket: WebSocket, user: JWTPayload) {
    const client: ConnectedClient = { socket, user };
    this.clients.add(client);

    // Diffusion de la présence mise à jour à tous les clients (y compris le nouveau)
    this.broadcastPresence();

    socket.on('message', (raw: any) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const data = JSON.parse(text);

        if (data.type === 'ping') {
          this.sendToSocket(socket, { type: 'pong' });
        }
      } catch {
        // Message invalide ignoré
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
      this.broadcastPresence();
    });

    socket.on('error', () => {
      this.clients.delete(client);
      this.broadcastPresence();
    });
  }

  getOnlineUsers(): ChatConnectedUser[] {
    const userMap = new Map<number, ChatConnectedUser>();
    for (const client of this.clients) {
      if (!userMap.has(client.user.id)) {
        userMap.set(client.user.id, {
          id: client.user.id,
          username: client.user.username,
          avatar: '',
          profil: client.user.profil,
        });
      }
    }
    return Array.from(userMap.values()).sort((a, b) =>
      a.username.localeCompare(b.username)
    );
  }

  broadcastPresence() {
    this.broadcast({
      type: 'presence',
      users: this.getOnlineUsers(),
    });
  }

  private broadcast(data: any) {
    const json = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(json);
      }
    }
  }

  private sendToSocket(socket: WebSocket, data: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  clear() {
    this.clients.clear();
  }
}

export const presenceWebSocketService = new PresenceWebSocketService();
