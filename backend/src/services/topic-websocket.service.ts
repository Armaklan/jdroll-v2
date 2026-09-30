import { WebSocket } from 'ws';
import { JWTPayload } from '../types/index.js';
import {
  domainEventBus,
  IEventBus,
} from '../events/event-bus.js';
import { PostCreatedEvent, RollCreatedEvent } from '../events/events.js';
import {
  forumRepository,
  IForumRepository,
} from '../repositories/forum.repository.js';

interface ConnectedClient {
  socket: WebSocket;
  user: JWTPayload;
  subscribedTopics: Set<number>;
}

/**
 * Salon WebSocket dédié à la lecture d'un sujet : chaque lecteur authentifié
 * souscrit au sujet qu'il consulte et est averti en direct dès qu'un nouveau
 * message (ou un jet de dés publié) y est posté, via le bus d'événements.
 */
export class TopicWebSocketService {
  private clients = new Set<ConnectedClient>();
  private isRegistered = false;

  constructor(
    private readonly eventBus: IEventBus = domainEventBus,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;
    this.eventBus.subscribe<PostCreatedEvent>('PostCreated', (event) =>
      this.broadcastNewPost(event.topicId, event.postId, event.userId)
    );
    this.eventBus.subscribe<RollCreatedEvent>('RollCreated', (event) => {
      if (event.topicId && event.postId) {
        this.broadcastNewPost(event.topicId, event.postId, event.userId);
      }
    });
  }

  async handleConnection(socket: WebSocket, user: JWTPayload) {
    const client: ConnectedClient = { socket, user, subscribedTopics: new Set<number>() };
    this.clients.add(client);

    socket.on('message', async (raw: any) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const data = JSON.parse(text);

        if (data.type === 'ping') {
          this.sendToSocket(socket, { type: 'pong' });
          return;
        }

        if (data.type === 'subscribe_topic') {
          const topicId = Number(data.topicId);
          if (!Number.isInteger(topicId) || topicId <= 0) {
            this.sendToSocket(socket, { type: 'error', message: 'Identifiant de sujet invalide' });
            return;
          }
          const canRead = await this.canUserReadTopic(topicId, user);
          if (!canRead) {
            this.sendToSocket(socket, {
              type: 'error',
              message: "Vous n'avez pas accès à ce sujet",
            });
            return;
          }
          client.subscribedTopics.add(topicId);
          this.sendToSocket(socket, { type: 'subscribed', topicId });
          return;
        }

        if (data.type === 'unsubscribe_topic') {
          const topicId = Number(data.topicId);
          if (Number.isInteger(topicId)) {
            client.subscribedTopics.delete(topicId);
          }
        }
      } catch {
        // Message invalide ignoré
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
    });

    socket.on('error', () => {
      this.clients.delete(client);
    });
  }

  private async canUserReadTopic(topicId: number, user: JWTPayload): Promise<boolean> {
    const topic = await this.forumRepo.findTopicById(topicId);
    if (!topic) {
      return false;
    }
    if (Number(topic.isPrivate || 0) !== 1) {
      return true;
    }
    if (topic.campagneId && topic.campagneId > 0) {
      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, user.id);
      if (isMj) {
        return true;
      }
    }
    return this.forumRepo.isUserTopicCanRead(topic.id, user.id);
  }

  private broadcastNewPost(topicId: number, postId: number, userId: number | null): void {
    const payload = JSON.stringify({
      type: 'topic_new_posts',
      topicId,
      postId,
      userId,
    });
    for (const client of this.clients) {
      if (client.subscribedTopics.has(topicId) && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    }
  }

  private sendToSocket(socket: WebSocket, data: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
}

export const topicWebSocketService = new TopicWebSocketService();
