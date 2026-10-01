import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatQueries } from './chat.queries.js';
import { IChatRepository } from '../repositories/chat.repository.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { ChatMessage } from '../types/index.js';

describe('ChatQueries', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 1,
      username: 'Alice',
      userAvatar: 'avatar1.png',
      userProfil: 1,
      time: '2026-09-16 12:00:00',
      message: 'Salut tout le monde !',
      to: '',
      to_username: '',
    },
    {
      id: 2,
      username: 'Bob',
      userAvatar: 'avatar2.png',
      userProfil: 0,
      time: '2026-09-16 12:05:00',
      message: 'Salut Alice en privé',
      to: '1',
      to_username: 'Alice',
    },
  ];

  const mockChatRepo: IChatRepository = {
    createMessage: async () => mockMessages[0],
    getRecentMessages: async (userId: number, username: string, limit?: number) => {
      return mockMessages;
    },
    getRecentPublicMessages: async (limit?: number) => {
      return mockMessages.filter((m) => m.to === '' && m.to_username === '');
    },
    getMessageById: async (id: number) => mockMessages.find((m) => m.id === id) || null,
    deleteMessage: async () => {},
    deleteAllMessages: async () => 0,
  };

  const mockUserRepo: IUserRepository = {
    findById: async () => null,
    findByUsernameOrEmail: async () => null,
    findByUsernames: async () => [],
    searchByUsername: async (q, excludeId) => [
      { id: 2, username: 'Bob', avatar: 'avatar2.png' },
    ],
    existsByUsernameOrEmail: async () => false,
    create: async () => ({} as any),
  };

  const queries = new ChatQueries(mockChatRepo, mockUserRepo);

  it('récupère les messages récents du tchat', async () => {
    const messages = await queries.getRecentMessages(1, 'Alice', 200);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].message, 'Salut tout le monde !');
    assert.equal(messages[1].to_username, 'Alice');
  });

  it('normalise les messages legacy avec to="0" comme messages publics', async () => {
    const legacyRepo: IChatRepository = {
      createMessage: async () => mockMessages[0],
      getRecentMessages: async () => [
        {
          id: 10,
          username: 'Bob',
          userAvatar: 'avatar2.png',
          userProfil: 0,
          time: '2026-09-16 12:10:00',
          message: 'Message legacy public avec to=0',
          to: '0',
          to_username: '',
        },
      ],
      getMessageById: async () => null,
      deleteMessage: async () => {},
      deleteAllMessages: async () => 0,
    };
    const legacyQueries = new ChatQueries(legacyRepo, mockUserRepo);

    const messages = await legacyQueries.getRecentMessages(1, 'Alice', 200);

    assert.equal(messages.length, 1);
    assert.equal(messages[0].to, '');
    assert.equal(messages[0].to_username, '');
  });

  it('masque les messages privés legacy destinés à d\'autres utilisateurs (to vide, to_username renseigné)', async () => {
    const legacyPrivateRepo: IChatRepository = {
      createMessage: async () => mockMessages[0],
      getRecentMessages: async () => [
        {
          id: 20,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:20:00',
          message: 'Message public',
          to: '',
          to_username: '',
        },
        {
          id: 21,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:21:00',
          message: 'MP legacy pour Alice',
          to: '',
          to_username: 'Alice',
        },
        {
          id: 22,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:22:00',
          message: 'MP legacy pour Carol',
          to: '',
          to_username: 'Carol',
        },
        {
          id: 23,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:23:00',
          message: 'MP pour Alice',
          to: '1',
          to_username: 'Alice',
        },
        {
          id: 24,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:24:00',
          message: 'MP pour Carol',
          to: '42',
          to_username: 'Carol',
        },
        {
          id: 25,
          username: 'Alice',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:25:00',
          message: 'MP emis par Alice',
          to: '42',
          to_username: 'Carol',
        },
      ],
      getMessageById: async () => null,
      deleteMessage: async () => {},
      deleteAllMessages: async () => 0,
    };
    const legacyPrivateQueries = new ChatQueries(legacyPrivateRepo, mockUserRepo);

    const messages = await legacyPrivateQueries.getRecentMessages(1, 'Alice', 200);

    assert.deepEqual(
      messages.map((m) => m.id),
      [20, 21, 23, 25]
    );
  });

  it('affiche les messages privés legacy qui me sont destinés (to vide, to_username = mon pseudo)', async () => {
    const legacyPrivateRepo: IChatRepository = {
      createMessage: async () => mockMessages[0],
      getRecentMessages: async () => [
        {
          id: 30,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:30:00',
          message: 'MP legacy pour Carol',
          to: '',
          to_username: 'Carol',
        },
      ],
      getMessageById: async () => null,
      deleteMessage: async () => {},
      deleteAllMessages: async () => 0,
    };
    const legacyPrivateQueries = new ChatQueries(legacyPrivateRepo, mockUserRepo);

    const messages = await legacyPrivateQueries.getRecentMessages(42, 'Carol', 200);

    assert.equal(messages.length, 1);
    assert.equal(messages[0].id, 30);
  });

  it('renvoie uniquement les messages publics pour un visiteur non authentifié', async () => {
    const guestRepo: IChatRepository = {
      createMessage: async () => mockMessages[0],
      getRecentMessages: async () => [],
      getRecentPublicMessages: async () => [
        {
          id: 40,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:40:00',
          message: 'Message legacy public avec to=0',
          to: '0',
          to_username: '',
        },
        {
          id: 41,
          username: 'Alice',
          userAvatar: null,
          userProfil: 1,
          time: '2026-09-16 12:41:00',
          message: 'Message public',
          to: '',
          to_username: '',
        },
        {
          id: 42,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:42:00',
          message: 'MP pour Alice',
          to: '1',
          to_username: 'Alice',
        },
        {
          id: 43,
          username: 'Bob',
          userAvatar: null,
          userProfil: 0,
          time: '2026-09-16 12:43:00',
          message: 'MP legacy pour Alice',
          to: '',
          to_username: 'Alice',
        },
      ],
      getMessageById: async () => null,
      deleteMessage: async () => {},
      deleteAllMessages: async () => 0,
    };
    const guestQueries = new ChatQueries(guestRepo, mockUserRepo);

    const messages = await guestQueries.getPublicRecentMessages(200);

    assert.deepEqual(
      messages.map((m) => m.id),
      [40, 41]
    );
    assert.equal(messages[0].to, '');
    assert.equal(messages[0].to_username, '');
  });

  it('recherche des utilisateurs pour démarrer une conversation privée', async () => {
    const users = await queries.searchUsers('bo', 1);
    assert.equal(users.length, 1);
    assert.equal(users[0].username, 'Bob');
  });

  it('renvoie une liste vide si la requête de recherche est vide', async () => {
    const users = await queries.searchUsers('   ', 1);
    assert.equal(users.length, 0);
  });
});
