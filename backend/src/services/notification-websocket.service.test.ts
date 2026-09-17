import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { NotificationWebSocketService } from './notification-websocket.service.js';
import { NotificationQueries } from '../queries/notification.queries.js';
import { INotificationRepository } from '../repositories/notification.repository.js';
import { NotificationItem, JWTPayload } from '../types/index.js';

class MockWebSocket extends EventEmitter {
  public readyState = 1; // WebSocket.OPEN
  public sentMessages: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.emit('close');
  }
}

describe('NotificationWebSocketService', () => {
  const setup = () => {
    const notifications: NotificationItem[] = [
      {
        id: 1,
        userId: 10,
        title: 'Nouveau message',
        content: 'Contenu du message',
        url: '/topics/1',
        type: 'topic',
        targetId: 1,
        nb: 1,
        lastUpdate: new Date().toISOString(),
      },
    ];

    const mockRepo: Partial<INotificationRepository> = {
      findByUserId: async (userId: number) =>
        notifications.filter((n) => n.userId === userId),
      countByUserId: async (userId: number) =>
        notifications.filter((n) => n.userId === userId).length,
    };

    const queries = new NotificationQueries(mockRepo as INotificationRepository);
    const wsService = new NotificationWebSocketService(queries);

    return { wsService, mockRepo, notifications };
  };

  it('should send initial notifications upon connection', async () => {
    const { wsService } = setup();
    const socket = new MockWebSocket();
    const user: JWTPayload = { id: 10, username: 'testuser', profil: 1 };

    await wsService.handleConnection(socket as any, user);

    assert.equal(socket.sentMessages.length, 1);
    const initMsg = JSON.parse(socket.sentMessages[0]);
    assert.equal(initMsg.type, 'init');
    assert.equal(initMsg.notifications.length, 1);
    assert.equal(initMsg.total, 1);
    assert.equal(wsService.getConnectedUserCount(), 1);
  });

  it('should reply with pong when receiving ping message', async () => {
    const { wsService } = setup();
    const socket = new MockWebSocket();
    const user: JWTPayload = { id: 10, username: 'testuser', profil: 1 };

    await wsService.handleConnection(socket as any, user);
    socket.emit('message', JSON.stringify({ type: 'ping' }));

    assert.equal(socket.sentMessages.length, 2);
    const pongMsg = JSON.parse(socket.sentMessages[1]);
    assert.equal(pongMsg.type, 'pong');
  });

  it('should push notification only to target user sockets', async () => {
    const { wsService } = setup();
    const socketUser10 = new MockWebSocket();
    const socketUser20 = new MockWebSocket();

    const user10: JWTPayload = { id: 10, username: 'user10', profil: 1 };
    const user20: JWTPayload = { id: 20, username: 'user20', profil: 1 };

    await wsService.handleConnection(socketUser10 as any, user10);
    await wsService.handleConnection(socketUser20 as any, user20);

    const newNotif: NotificationItem = {
      id: 2,
      userId: 10,
      title: 'Alerte PJ',
      content: 'Action requise',
      url: '/campaigns/1',
      type: 'perso',
      targetId: 1,
      nb: 1,
      lastUpdate: new Date().toISOString(),
    };

    wsService.sendNotification(10, newNotif);

    // socketUser10 should have received init + newNotif
    assert.equal(socketUser10.sentMessages.length, 2);
    const notifMsg = JSON.parse(socketUser10.sentMessages[1]);
    assert.equal(notifMsg.type, 'notification');
    assert.equal(notifMsg.notification.title, 'Alerte PJ');

    // socketUser20 should only have init
    assert.equal(socketUser20.sentMessages.length, 1);
  });

  it('should push notification deletion and clear events to target user', async () => {
    const { wsService } = setup();
    const socket = new MockWebSocket();
    const user: JWTPayload = { id: 10, username: 'user10', profil: 1 };

    await wsService.handleConnection(socket as any, user);

    wsService.sendNotificationDeleted(10, 1);
    assert.equal(socket.sentMessages.length, 2);
    const deleteMsg = JSON.parse(socket.sentMessages[1]);
    assert.equal(deleteMsg.type, 'notification_deleted');
    assert.equal(deleteMsg.id, 1);

    wsService.sendNotificationsCleared(10);
    assert.equal(socket.sentMessages.length, 3);
    const clearMsg = JSON.parse(socket.sentMessages[2]);
    assert.equal(clearMsg.type, 'notifications_cleared');
  });

  it('should remove socket on close or error', async () => {
    const { wsService } = setup();
    const socket = new MockWebSocket();
    const user: JWTPayload = { id: 10, username: 'user10', profil: 1 };

    await wsService.handleConnection(socket as any, user);
    assert.equal(wsService.getConnectedUserCount(), 1);

    socket.close();
    assert.equal(wsService.getConnectedUserCount(), 0);
  });
});
