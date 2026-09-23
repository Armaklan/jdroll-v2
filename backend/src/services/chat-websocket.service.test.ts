import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { ChatWebSocketService } from './chat-websocket.service.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { SendChatMessageUseCase } from '../usecases/chat/send-chat-message.usecase.js';
import { CreateOrUpdateNotificationUseCase } from '../usecases/notification/create-or-update-notification.usecase.js';
import { INotificationRepository } from '../repositories/notification.repository.js';
import { IChatRepository } from '../repositories/chat.repository.js';
import { ChatMessage, JWTPayload } from '../types/index.js';

class MockWebSocket extends EventEmitter {
  public sentMessages: string[] = [];
  public readyState: number = 1; // WebSocket.OPEN

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.emit('close');
  }
}

describe('ChatWebSocketService', () => {
  const setup = () => {
    const notifications: any[] = [];
    const mockNotifRepo: INotificationRepository = {
      findByUserId: async () => [],
      countByUserId: async () => 0,
      findNotification: async () => null,
      createNotification: async (data) => {
        notifications.push(data);
        return notifications.length;
      },
      updateNotification: async () => {},
      deleteNotification: async () => true,
      deleteAllByUserId: async () => 0,
    };

    const mockNotifWsService: any = {
      sendNotification: () => {},
      handleConnection: async () => {},
      sendNotificationDeleted: () => {},
      sendNotificationsCleared: () => {},
      sendNotificationsUpdate: () => {},
      getConnectedUserCount: () => 0,
    };

    const mockUserRepoForNotif: IUserRepository = {
      findById: async (id) => ({
        id,
        username: id === 1 ? 'Alice' : id === 2 ? 'Bob' : 'Charlie',
        mail: 'user@test.com',
        avatar: '',
        description: '',
        profil: 1,
        titre: '',
        subscribe_date: '',
        notif_mp: 1,
      }),
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
      updateProfile: async () => ({} as any),
      updateNotificationSettings: async () => ({} as any),
      updatePassword: async () => {},
    };

    const notifUseCase = new CreateOrUpdateNotificationUseCase(
      mockNotifRepo,
      mockNotifWsService,
      mockUserRepoForNotif
    );

    const mockChatRepo: IChatRepository = {
      createMessage: async (d) => ({
        id: 100,
        username: d.username,
        userAvatar: 'avatar.png',
        userProfil: 1,
        time: '2026-09-16 12:00:00',
        message: d.message,
        to: d.to || '',
        to_username: d.to_username || '',
      }),
      getRecentMessages: async () => [],
      getMessageById: async () => null,
    };

    const mockUserRepo: IUserRepository = {
      findById: async (id) => ({
        id,
        username: id === 1 ? 'Alice' : id === 2 ? 'Bob' : 'Charlie',
        mail: 'user@test.com',
        avatar: id === 1 ? 'alice.png' : 'bob.png',
        description: '',
        profil: 1,
        titre: '',
        subscribe_date: '',
      }),
      findByUsernameOrEmail: async (identifier) => {
        if (identifier === 'Alice') {
          return { id: 1, username: 'Alice', mail: 'alice@test.com', avatar: '', description: '', profil: 1, titre: '', subscribe_date: '' };
        }
        if (identifier === 'Bob') {
          return { id: 2, username: 'Bob', mail: 'bob@test.com', avatar: '', description: '', profil: 0, titre: '', subscribe_date: '' };
        }
        if (identifier === 'Charlie') {
          return { id: 3, username: 'Charlie', mail: 'charlie@test.com', avatar: '', description: '', profil: 0, titre: '', subscribe_date: '' };
        }
        return null;
      },
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    };

    const useCase = new SendChatMessageUseCase(mockChatRepo, mockUserRepo);
    const wsService = new ChatWebSocketService(mockUserRepo, useCase, notifUseCase);

    return { wsService, mockUserRepo, useCase, notifUseCase, notifications };
  };

  it('gère la connexion et la présence des utilisateurs', async () => {
    const { wsService } = setup();

    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const online1 = wsService.getOnlineUsers();
    assert.equal(online1.length, 1);
    assert.equal(online1[0].username, 'Alice');
    assert.equal(online1[0].avatar, 'alice.png');

    const socket2 = new MockWebSocket() as any;
    const user2: JWTPayload = { id: 2, username: 'Bob', mail: 'bob@test.com', profil: 0 };
    await wsService.handleConnection(socket2, user2);

    const online2 = wsService.getOnlineUsers();
    assert.equal(online2.length, 2);

    // Close socket1
    socket1.close();
    const online3 = wsService.getOnlineUsers();
    assert.equal(online3.length, 1);
    assert.equal(online3[0].username, 'Bob');
  });

  it('diffuse un message public à tous les utilisateurs connectés', async () => {
    const { wsService } = setup();

    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const socket2 = new MockWebSocket() as any;
    const user2: JWTPayload = { id: 2, username: 'Bob', mail: 'bob@test.com', profil: 0 };
    await wsService.handleConnection(socket2, user2);

    const message: ChatMessage = {
      id: 50,
      username: 'Alice',
      time: '2026-09-16 12:00:00',
      message: 'Coucou salon général',
      to: '',
      to_username: '',
    };

    wsService.broadcastChatMessage(message);

    const lastMsg1 = JSON.parse(socket1.sentMessages[socket1.sentMessages.length - 1]);
    const lastMsg2 = JSON.parse(socket2.sentMessages[socket2.sentMessages.length - 1]);

    assert.equal(lastMsg1.type, 'chat_message');
    assert.equal(lastMsg1.message.message, 'Coucou salon général');
    assert.equal(lastMsg2.type, 'chat_message');
    assert.equal(lastMsg2.message.message, 'Coucou salon général');
  });

  it('diffuse un message privé uniquement à l’expéditeur et au destinataire', async () => {
    const { wsService } = setup();

    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const socket2 = new MockWebSocket() as any;
    const user2: JWTPayload = { id: 2, username: 'Bob', mail: 'bob@test.com', profil: 0 };
    await wsService.handleConnection(socket2, user2);

    const socket3 = new MockWebSocket() as any;
    const user3: JWTPayload = { id: 3, username: 'Charlie', mail: 'charlie@test.com', profil: 0 };
    await wsService.handleConnection(socket3, user3);

    const initialLen3 = socket3.sentMessages.length;

    const privateMessage: ChatMessage = {
      id: 51,
      username: 'Alice',
      time: '2026-09-16 12:00:00',
      message: 'Message pour Bob',
      to: '2',
      to_username: 'Bob',
    };

    wsService.broadcastChatMessage(privateMessage);

    const lastMsg1 = JSON.parse(socket1.sentMessages[socket1.sentMessages.length - 1]);
    const lastMsg2 = JSON.parse(socket2.sentMessages[socket2.sentMessages.length - 1]);

    assert.equal(lastMsg1.message.message, 'Message pour Bob');
    assert.equal(lastMsg2.message.message, 'Message pour Bob');
    // Charlie should NOT have received this message
    assert.equal(socket3.sentMessages.length, initialLen3);
  });

  it('crée une notification si le destinataire d’un message privé n’est pas connecté au tchat', async () => {
    const { wsService, notifications } = setup();

    // Only Alice is connected
    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const privateMessageToOfflineBob: ChatMessage = {
      id: 52,
      username: 'Alice',
      time: '2026-09-16 12:05:00',
      message: 'Coucou Bob es-tu là ?',
      to: '2',
      to_username: 'Bob',
    };

    wsService.broadcastChatMessage(privateMessageToOfflineBob);

    // Wait a tick for async notification
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].userId, 2);
    assert.equal(notifications[0].type, 'chat');
    assert.equal(notifications[0].targetId, 1);
    assert.equal(notifications[0].title, 'Nouveau message sur le tchat');
    assert.match(notifications[0].content, /Alice/);
    assert.equal(notifications[0].url, '/chat');
  });

  it('ne crée PAS de notification si le destinataire est connecté au tchat', async () => {
    const { wsService, notifications } = setup();

    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const socket2 = new MockWebSocket() as any;
    const user2: JWTPayload = { id: 2, username: 'Bob', mail: 'bob@test.com', profil: 0 };
    await wsService.handleConnection(socket2, user2);

    const privateMessageToOnlineBob: ChatMessage = {
      id: 53,
      username: 'Alice',
      time: '2026-09-16 12:06:00',
      message: 'Salut Bob !',
      to: '2',
      to_username: 'Bob',
    };

    wsService.broadcastChatMessage(privateMessageToOnlineBob);

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(notifications.length, 0);
  });

  it('ne crée PAS de notification pour un message public dans le salon général', async () => {
    const { wsService, notifications } = setup();

    const socket1 = new MockWebSocket() as any;
    const user1: JWTPayload = { id: 1, username: 'Alice', mail: 'alice@test.com', profil: 1 };
    await wsService.handleConnection(socket1, user1);

    const generalMessage: ChatMessage = {
      id: 54,
      username: 'Alice',
      time: '2026-09-16 12:07:00',
      message: 'Hello le salon général',
      to: '',
      to_username: '',
    };

    wsService.broadcastChatMessage(generalMessage);

    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(notifications.length, 0);
  });
});
