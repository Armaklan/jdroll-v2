import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ClearChatUseCase } from './clear-chat.usecase.js';
import { IChatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { ForbiddenError } from '../../errors/domain.errors.js';
import { User } from '../../types/index.js';

describe('ClearChatUseCase', () => {
  let clearCalls: number;
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
    clearCalls = 0;

    mockChatRepo = {
      createMessage: async () => ({} as any),
      getRecentMessages: async () => [],
      getMessageById: async () => null,
      deleteMessage: async () => {},
      deleteAllMessages: async () => {
        clearCalls += 1;
        return 120;
      },
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

  it('permet à un administrateur (profil 2) de vider le tchat', async () => {
    const useCase = new ClearChatUseCase(mockChatRepo, mockUserRepo);
    const result = await useCase.execute({ userId: 1 });

    assert.equal(result.success, true);
    assert.equal(result.deletedCount, 120);
    assert.equal(clearCalls, 1);
  });

  it('refuse le vidage pour un non-administrateur', async () => {
    const useCase = new ClearChatUseCase(mockChatRepo, mockUserRepo);
    await assert.rejects(
      () => useCase.execute({ userId: 2 }),
      ForbiddenError
    );
    assert.equal(clearCalls, 0);
  });

  it('refuse le vidage pour un non-administrateur même avec userProfil explicite', async () => {
    const useCase = new ClearChatUseCase(mockChatRepo, mockUserRepo);
    await assert.rejects(
      () => useCase.execute({ userId: 2, userProfil: 1 }),
      ForbiddenError
    );
    assert.equal(clearCalls, 0);
  });
});
