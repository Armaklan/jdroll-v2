import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendChatMessageUseCase } from './send-chat-message.usecase.js';
import { IChatRepository } from '../../repositories/chat.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { ValidationError, UserNotFoundError } from '../../errors/domain.errors.js';
import { ChatMessage, User } from '../../types/index.js';

describe('SendChatMessageUseCase', () => {
  const createMockContext = () => {
    let createdMessageData: any = null;

    const mockChatRepo: IChatRepository = {
      createMessage: async (data) => {
        createdMessageData = data;
        return {
          id: 42,
          username: data.username,
          userAvatar: 'avatar.png',
          userProfil: 1,
          time: '2026-09-16 12:00:00',
          message: data.message,
          to: data.to || '',
          to_username: data.to_username || '',
        };
      },
      getRecentMessages: async () => [],
      getMessageById: async () => null,
    };

    const mockUsers: User[] = [
      {
        id: 10,
        username: 'Alice',
        mail: 'alice@test.com',
        avatar: '',
        description: '',
        profil: 1,
        titre: '',
        subscribe_date: '',
      },
      {
        id: 20,
        username: 'Bob',
        mail: 'bob@test.com',
        avatar: '',
        description: '',
        profil: 0,
        titre: '',
        subscribe_date: '',
      },
    ];

    const mockUserRepo: IUserRepository = {
      findById: async (id) => mockUsers.find((u) => u.id === id) || null,
      findByUsernameOrEmail: async (identifier) =>
        (mockUsers.find((u) => u.username === identifier || u.mail === identifier) as any) || null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    };

    const useCase = new SendChatMessageUseCase(mockChatRepo, mockUserRepo);

    return { useCase, mockChatRepo, mockUserRepo, getCreated: () => createdMessageData };
  };

  it('envoie un message public dans le salon général avec succès', async () => {
    const { useCase, getCreated } = createMockContext();
    const result = await useCase.execute({
      userId: 10,
      username: 'Alice',
      message: 'Hello salon !',
    });

    assert.equal(result.id, 42);
    assert.equal(result.message, 'Hello salon !');
    assert.equal(result.to, '');
    assert.equal(result.to_username, '');
    assert.deepEqual(getCreated(), {
      username: 'Alice',
      message: 'Hello salon !',
      to: '',
      to_username: '',
    });
  });

  it('envoie un message privé à un utilisateur par son identifiant', async () => {
    const { useCase, getCreated } = createMockContext();
    const result = await useCase.execute({
      userId: 10,
      username: 'Alice',
      message: 'Secret message',
      to: '20',
    });

    assert.equal(result.id, 42);
    assert.equal(result.to, '20');
    assert.equal(result.to_username, 'Bob');
    assert.deepEqual(getCreated(), {
      username: 'Alice',
      message: 'Secret message',
      to: '20',
      to_username: 'Bob',
    });
  });

  it('envoie un message privé à un utilisateur par son nom d’utilisateur', async () => {
    const { useCase, getCreated } = createMockContext();
    const result = await useCase.execute({
      userId: 10,
      username: 'Alice',
      message: 'Secret message 2',
      to_username: 'Bob',
    });

    assert.equal(result.id, 42);
    assert.equal(result.to, '20');
    assert.equal(result.to_username, 'Bob');
    assert.deepEqual(getCreated(), {
      username: 'Alice',
      message: 'Secret message 2',
      to: '20',
      to_username: 'Bob',
    });
  });

  it('lève ValidationError si le message est vide ou composé uniquement d’espaces', async () => {
    const { useCase } = createMockContext();
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 10,
          username: 'Alice',
          message: '   ',
        }),
      ValidationError
    );
  });

  it('lève UserNotFoundError si le destinataire id est introuvable', async () => {
    const { useCase } = createMockContext();
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 10,
          username: 'Alice',
          message: 'Hello',
          to: '999',
        }),
      UserNotFoundError
    );
  });

  it('lève UserNotFoundError si le destinataire nom est introuvable', async () => {
    const { useCase } = createMockContext();
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 10,
          username: 'Alice',
          message: 'Hello',
          to_username: 'Inconnu',
        }),
      UserNotFoundError
    );
  });
});
