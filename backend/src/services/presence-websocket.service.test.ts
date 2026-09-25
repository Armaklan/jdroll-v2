import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PresenceWebSocketService } from './presence-websocket.service.js';
import { JWTPayload } from '../types/index.js';

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

describe('PresenceWebSocketService', () => {
  const userA: JWTPayload = { id: 1, username: 'alice', mail: 'a@test.local', profil: 0 };
  const userB: JWTPayload = { id: 2, username: 'bob', mail: 'b@test.local', profil: 1 };

  it('envoie la présence initiale au client qui vient de se connecter', async () => {
    const service = new PresenceWebSocketService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);

    assert.equal(socket.sentMessages.length, 1);
    const initial = JSON.parse(socket.sentMessages[0]);
    assert.equal(initial.type, 'presence');
    assert.equal(initial.users.length, 1);
    assert.equal(initial.users[0].username, 'alice');
  });

  it('diffuse la présence à tous les clients quand un nouvel utilisateur se connecte', async () => {
    const service = new PresenceWebSocketService();
    const socketA = new MockWebSocket();
    const socketB = new MockWebSocket();

    await service.handleConnection(socketA as any, userA);
    await service.handleConnection(socketB as any, userB);

    // socketB : présence initiale avec les deux utilisateurs
    const initialB = JSON.parse(socketB.sentMessages[0]);
    assert.equal(initialB.type, 'presence');
    assert.equal(initialB.users.length, 2);

    // socketA : doit avoir reçu la mise à jour diffusée
    const updateA = JSON.parse(socketA.sentMessages[socketA.sentMessages.length - 1]);
    assert.equal(updateA.type, 'presence');
    assert.equal(updateA.users.length, 2);
    const usernames = updateA.users.map((u: { username: string }) => u.username);
    assert.ok(usernames.includes('alice'));
    assert.ok(usernames.includes('bob'));
  });

  it('déduplique les utilisateurs connectés depuis plusieurs onglets', async () => {
    const service = new PresenceWebSocketService();
    const socket1 = new MockWebSocket();
    const socket2 = new MockWebSocket();

    await service.handleConnection(socket1 as any, userA);
    await service.handleConnection(socket2 as any, { ...userA, mail: 'a@test.local' });

    const users = service.getOnlineUsers();
    assert.equal(users.length, 1);
    assert.equal(users[0].username, 'alice');
  });

  it('retire un utilisateur et rediffuse la présence à la déconnexion', async () => {
    const service = new PresenceWebSocketService();
    const socketA = new MockWebSocket();
    const socketB = new MockWebSocket();

    await service.handleConnection(socketA as any, userA);
    await service.handleConnection(socketB as any, userB);

    socketA.close();

    assert.equal(service.getOnlineUsers().length, 1);
    const updateB = JSON.parse(socketB.sentMessages[socketB.sentMessages.length - 1]);
    assert.equal(updateB.type, 'presence');
    const usernames = updateB.users.map((u: { username: string }) => u.username);
    assert.ok(!usernames.includes('alice'));
    assert.ok(usernames.includes('bob'));
  });

  it('répond pong à un ping', async () => {
    const service = new PresenceWebSocketService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'ping' }));

    const last = JSON.parse(socket.sentMessages[socket.sentMessages.length - 1]);
    assert.equal(last.type, 'pong');
  });

  it('retire aussi le client en cas d\'erreur de socket', async () => {
    const service = new PresenceWebSocketService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    assert.equal(service.getOnlineUsers().length, 1);

    socket.emit('error');
    assert.equal(service.getOnlineUsers().length, 0);
  });
});
