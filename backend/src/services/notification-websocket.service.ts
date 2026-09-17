import { WebSocket } from 'ws';
import { JWTPayload, NotificationItem } from '../types/index.js';
import {
  NotificationQueries,
  notificationQueries,
} from '../queries/notification.queries.js';

interface ConnectedClient {
  socket: WebSocket;
  user: JWTPayload;
}

export interface INotificationWebSocketService {
  handleConnection(socket: WebSocket, user: JWTPayload): Promise<void>;
  sendNotification(userId: number, notification: NotificationItem): void;
  sendNotificationDeleted(userId: number, notificationId: number): void;
  sendNotificationsCleared(userId: number): void;
  sendNotificationsUpdate(
    userId: number,
    notifications: NotificationItem[],
    total: number
  ): void;
  getConnectedUserCount(): number;
}

export class NotificationWebSocketService implements INotificationWebSocketService {
  private clients = new Set<ConnectedClient>();

  constructor(
    private readonly notifQueries: NotificationQueries = notificationQueries
  ) {}

  async handleConnection(socket: WebSocket, user: JWTPayload): Promise<void> {
    const client: ConnectedClient = { socket, user };
    this.clients.add(client);

    // Send initial notifications to newly connected client
    try {
      const result = await this.notifQueries.getUserNotifications(user.id);
      this.sendToSocket(socket, {
        type: 'init',
        notifications: result.notifications,
        total: result.total,
      });
    } catch {
      // ignore query error on init
    }

    socket.on('message', (raw: any) => {
      try {
        const text = typeof raw === 'string' ? raw : raw.toString();
        const data = JSON.parse(text);

        if (data.type === 'ping') {
          this.sendToSocket(socket, { type: 'pong' });
        }
      } catch {
        // ignore non-json
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
    });

    socket.on('error', () => {
      this.clients.delete(client);
    });
  }

  sendNotification(userId: number, notification: NotificationItem): void {
    for (const client of this.clients) {
      if (client.user.id === userId) {
        this.sendToSocket(client.socket, {
          type: 'notification',
          notification,
        });
      }
    }
  }

  sendNotificationDeleted(userId: number, notificationId: number): void {
    for (const client of this.clients) {
      if (client.user.id === userId) {
        this.sendToSocket(client.socket, {
          type: 'notification_deleted',
          id: notificationId,
        });
      }
    }
  }

  sendNotificationsCleared(userId: number): void {
    for (const client of this.clients) {
      if (client.user.id === userId) {
        this.sendToSocket(client.socket, {
          type: 'notifications_cleared',
        });
      }
    }
  }

  sendNotificationsUpdate(
    userId: number,
    notifications: NotificationItem[],
    total: number
  ): void {
    for (const client of this.clients) {
      if (client.user.id === userId) {
        this.sendToSocket(client.socket, {
          type: 'notifications_update',
          notifications,
          total,
        });
      }
    }
  }

  getConnectedUserCount(): number {
    const uniqueUserIds = new Set<number>();
    for (const client of this.clients) {
      uniqueUserIds.add(client.user.id);
    }
    return uniqueUserIds.size;
  }

  private sendToSocket(socket: WebSocket, data: any) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }
}

export const notificationWebSocketService: INotificationWebSocketService =
  new NotificationWebSocketService();
