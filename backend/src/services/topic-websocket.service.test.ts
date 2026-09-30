import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { TopicWebSocketService } from './topic-websocket.service.js';
import { DomainEventBus, IEventBus } from '../events/event-bus.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import { RawTopicDetail } from '../types/index.js';

class MockWebSocket extends EventEmitter {
  public readyState = 1; // WebSocket.OPEN
  public sentMessages: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.emit('close');
  }

  lastMessage(): any {
    assert.ok(this.sentMessages.length > 0, 'aucun message envoyé');
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1]);
  }
}

const publicTopic: RawTopicDetail = {
  id: 101,
  sectionId: 10,
  sectionTitle: 'Général',
  campagneId: 1,
  campaignTitle: 'Campagne',
  title: 'Sujet public',
  stickable: 0,
  isPrivate: 0,
  isClosed: 0,
  ordre: 1,
};

const privateTopic: RawTopicDetail = {
  ...publicTopic,
  id: 301,
  title: 'Sujet privé',
  isPrivate: 1,
};

const otherTopic: RawTopicDetail = {
  ...publicTopic,
  id: 202,
};

function buildMockForumRepo(): IForumRepository {
  return {
    findTopicById: async (topicId: number) => {
      if (topicId === publicTopic.id) return publicTopic;
      if (topicId === privateTopic.id) return privateTopic;
      if (topicId === otherTopic.id) return otherTopic;
      return null;
    },
    isUserCampaignMj: async (campagneId: number, userId: number) =>
      campagneId === 1 && userId === 1,
    isUserTopicCanRead: async (topicId: number, userId: number) =>
      topicId === 301 && userId === 2,
  } as unknown as IForumRepository;
}

describe('TopicWebSocketService', () => {
  const userA = { id: 1, username: 'alice', mail: 'a@test.local', profil: 0 };
  const userB = { id: 2, username: 'bob', mail: 'b@test.local', profil: 0 };
  const userC = { id: 3, username: 'carol', mail: 'c@test.local', profil: 0 };

  const buildService = (): { service: TopicWebSocketService; eventBus: IEventBus } => {
    const eventBus = new DomainEventBus();
    const service = new TopicWebSocketService(eventBus, buildMockForumRepo());
    service.register();
    return { service, eventBus };
  };

  it('répond pong à un ping', async () => {
    const { service } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'ping' }));

    assert.equal(socket.lastMessage().type, 'pong');
  });

  it('confirme la souscription à un sujet public et diffuse les nouveaux messages', async () => {
    const { service, eventBus } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 101 }));

    // On laisse la vérification d'accès asynchrone se terminer
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(socket.lastMessage().type, 'subscribed');
    assert.equal(socket.lastMessage().topicId, 101);

    await eventBus.publish({
      name: 'PostCreated',
      postId: 500,
      topicId: 101,
      campagneId: 1,
      userId: 2,
      topicTitle: 'Sujet public',
      isPrivate: 0,
    });

    const notification = socket.lastMessage();
    assert.equal(notification.type, 'topic_new_posts');
    assert.equal(notification.topicId, 101);
    assert.equal(notification.postId, 500);
    assert.equal(notification.userId, 2);
  });

  it('refuse la souscription à un sujet privé sans accès et ne diffuse rien', async () => {
    const { service, eventBus } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userC);
    socket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 301 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(socket.lastMessage().type, 'error');

    const messageCountBefore = socket.sentMessages.length;
    await eventBus.publish({
      name: 'PostCreated',
      postId: 501,
      topicId: 301,
      campagneId: 1,
      userId: 1,
      topicTitle: 'Sujet privé',
      isPrivate: 1,
    });

    assert.equal(socket.sentMessages.length, messageCountBefore);
  });

  it('autorise la souscription à un sujet privé pour le MJ ou un utilisateur autorisé', async () => {
    const { service } = buildService();
    const mjSocket = new MockWebSocket();
    const readerSocket = new MockWebSocket();

    await service.handleConnection(mjSocket as any, userA);
    await service.handleConnection(readerSocket as any, userB);

    mjSocket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 301 }));
    readerSocket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 301 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(mjSocket.lastMessage().type, 'subscribed');
    assert.equal(readerSocket.lastMessage().type, 'subscribed');
  });

  it('refuse la souscription à un sujet inexistant', async () => {
    const { service } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 9999 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert.equal(socket.lastMessage().type, 'error');
  });

  it('ne diffuse pas les événements des sujets non souscrits et respecte le désabonnement', async () => {
    const { service, eventBus } = buildService();
    const socketA = new MockWebSocket();
    const socketB = new MockWebSocket();

    await service.handleConnection(socketA as any, userA);
    await service.handleConnection(socketB as any, userB);

    socketA.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 101 }));
    socketB.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 202 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    await eventBus.publish({
      name: 'PostCreated',
      postId: 502,
      topicId: 202,
      campagneId: 1,
      userId: 1,
      topicTitle: 'Autre sujet',
      isPrivate: 0,
    });

    // socketB (souscrit à 202) reçoit l'événement, pas socketA (souscrit à 101)
    assert.equal(socketB.lastMessage().type, 'topic_new_posts');
    const lastA = JSON.parse(socketA.sentMessages[socketA.sentMessages.length - 1]);
    assert.notEqual(lastA.type, 'topic_new_posts');

    // Désabonnement : socketB ne reçoit plus rien pour 202
    socketB.emit('message', JSON.stringify({ type: 'unsubscribe_topic', topicId: 202 }));
    await eventBus.publish({
      name: 'PostCreated',
      postId: 503,
      topicId: 202,
      campagneId: 1,
      userId: 1,
      topicTitle: 'Autre sujet',
      isPrivate: 0,
    });
    const messages = socketB.sentMessages.map((m) => JSON.parse(m).type);
    assert.equal(messages.filter((t) => t === 'topic_new_posts').length, 1);
  });

  it('diffuse aussi les jets de dés publiés dans un sujet (RollCreated)', async () => {
    const { service, eventBus } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 101 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    await eventBus.publish({
      name: 'RollCreated',
      rollId: 7,
      postId: 600,
      campagneId: 1,
      userId: 2,
      topicId: 101,
      isTower: false,
      formula: '1d20',
      result: '15',
    });

    const notification = socket.lastMessage();
    assert.equal(notification.type, 'topic_new_posts');
    assert.equal(notification.postId, 600);
  });

  it('retire le client à la déconnexion', async () => {
    const { service, eventBus } = buildService();
    const socket = new MockWebSocket();

    await service.handleConnection(socket as any, userA);
    socket.emit('message', JSON.stringify({ type: 'subscribe_topic', topicId: 101 }));
    await new Promise((resolve) => setTimeout(resolve, 10));

    socket.close();

    await eventBus.publish({
      name: 'PostCreated',
      postId: 504,
      topicId: 101,
      campagneId: 1,
      userId: 2,
      topicTitle: 'Sujet public',
      isPrivate: 0,
    });

    const types = socket.sentMessages.map((m) => JSON.parse(m).type);
    assert.ok(!types.includes('topic_new_posts'));
  });
});
