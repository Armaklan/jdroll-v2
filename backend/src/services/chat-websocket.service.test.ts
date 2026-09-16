import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { ChatWebSocketService } from './chat-websocket.service.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { SendChatMessageUseCase } from '../usecases/chat/send-chat-message.usecase.js';
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
        username: id === 1 ? 'Alice' : 'Bob',
        mail: 'user@test.com',
        avatar: id === 1 ? 'alice.png' : 'bob.png',
        description: '',
        profil: 1,
        titre: '',
        subscribe_date: '',
      }),
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    };

    const useCase = new SendChatMessageUseCase(mockChatRepo, mockUserRepo);
    const wsService = new ChatWebSocketService(mockUserRepo, useCase);

    return { wsService, mockUserRepo, useCase };
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
});
