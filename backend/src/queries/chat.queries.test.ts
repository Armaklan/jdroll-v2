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
    getMessageById: async (id: number) => mockMessages.find((m) => m.id === id) || null,
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
    };
    const legacyQueries = new ChatQueries(legacyRepo, mockUserRepo);

    const messages = await legacyQueries.getRecentMessages(1, 'Alice', 200);

    assert.equal(messages.length, 1);
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
