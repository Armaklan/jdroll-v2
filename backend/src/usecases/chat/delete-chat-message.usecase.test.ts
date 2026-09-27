import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteChatMessageUseCase } from './delete-chat-message.usecase.js';
import { IChatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { ForbiddenError, MessageNotFoundError } from '../../errors/domain.errors.js';
import { ChatMessage, User } from '../../types/index.js';

describe('DeleteChatMessageUseCase', () => {
  let messagesStore: Map<number, ChatMessage>;
  let deletedIds: number[];
  let mockChatRepo: IChatRepository;
  let mockUserRepo: IUserRepository;

  const mockUsers: User[] = [
    {
      id: 1,
      username: 'Admin',
      mail: 'admin@test.com',
      avatar: '',
      description: '',
      profil: 2,
      titre: '',
      subscribe_date: '',
    },
    {
      id: 2,
      username: 'Bob',
      mail: 'bob@test.com',
      avatar: '',
      description: '',
      profil: 0,
      titre: '',
      subscribe_date: '',
    },
  ];

  beforeEach(() => {
    messagesStore = new Map<number, ChatMessage>();
    messagesStore.set(42, {
      id: 42,
      username: 'Bob',
      userAvatar: null,
      userProfil: 0,
      time: '2026-09-16 12:00:00',
      message: 'Message à supprimer',
      to: '',
      to_username: '',
    });
    deletedIds = [];

    mockChatRepo = {
      createMessage: async () => ({} as ChatMessage),
      getRecentMessages: async () => [],
      getMessageById: async (id: number) => messagesStore.get(id) || null,
      deleteMessage: async (id: number) => {
        deletedIds.push(id);
        messagesStore.delete(id);
      },
      deleteAllMessages: async () => 0,
    };

    mockUserRepo = {
      findById: async (id) => mockUsers.find((u) => u.id === id) || null,
      findByUsernameOrEmail: async (identifier) =>
        (mockUsers.find((u) => u.username === identifier || u.mail === identifier) as any) || null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    } as IUserRepository;
  });

  it('permet à un administrateur (profil 2) de supprimer un message', async () => {
    const useCase = new DeleteChatMessageUseCase(mockChatRepo, mockUserRepo);
    const result = await useCase.execute({ messageId: 42, userId: 1 });

    assert.equal(result.success, true);
    assert.equal(result.deletedMessageId, 42);
    assert.deepEqual(deletedIds, [42]);
    assert.equal(messagesStore.has(42), false);
  });

  it('permet à un administrateur de supprimer un message privé', async () => {
    messagesStore.set(43, {
      id: 43,
      username: 'Bob',
      userAvatar: null,
      userProfil: 0,
      time: '2026-09-16 12:00:00',
      message: 'Message privé',
      to: '1',
      to_username: 'Admin',
    });

    const useCase = new DeleteChatMessageUseCase(mockChatRepo, mockUserRepo);
    const result = await useCase.execute({ messageId: 43, userId: 1 });

    assert.equal(result.success, true);
    assert.equal(result.deletedMessageId, 43);
  });

  it('refuse la suppression pour un non-administrateur', async () => {
    const useCase = new DeleteChatMessageUseCase(mockChatRepo, mockUserRepo);
    await assert.rejects(
      () => useCase.execute({ messageId: 42, userId: 2 }),
      ForbiddenError
    );
    assert.deepEqual(deletedIds, []);
    assert.equal(messagesStore.has(42), true);
  });

  it('refuse la suppression pour un non-administrateur même avec userProfil explicite', async () => {
    const useCase = new DeleteChatMessageUseCase(mockChatRepo, mockUserRepo);
    await assert.rejects(
      () => useCase.execute({ messageId: 42, userId: 2, userProfil: 1 }),
      ForbiddenError
    );
  });

  it('lève MessageNotFoundError si le message n’existe pas', async () => {
    const useCase = new DeleteChatMessageUseCase(mockChatRepo, mockUserRepo);
    await assert.rejects(
      () => useCase.execute({ messageId: 999, userId: 1 }),
      MessageNotFoundError
    );
  });
});
