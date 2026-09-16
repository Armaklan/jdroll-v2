import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendMessageUseCase } from './send-message.usecase.js';
import { IMessageRepository } from '../../repositories/message.repository.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { CreateOrUpdateNotificationUseCase } from '../notification/create-or-update-notification.usecase.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { User } from '../../types/index.js';

describe('SendMessageUseCase', () => {
  const createMockRepos = (existingUsers: User[] = []) => {
    const createdMessages: any[] = [];
    const notificationsSent: any[] = [];

    const mockMessageRepo: IMessageRepository = {
      createMessage: async (fromId, fromUsername, title, content, recipients) => {
        const id = createdMessages.length + 1;
        createdMessages.push({ id, fromId, fromUsername, title, content, recipients });
        return id;
      },
      getInbox: async () => [],
      getSent: async () => [],
      getMessageById: async () => null,
      getMessageRecipients: async () => [],
      isUserRecipient: async () => false,
      isUserSender: async () => false,
      getRecipientStatut: async () => null,
      markAsRead: async () => {},
      deleteFromInbox: async () => true,
      deleteFromSent: async () => true,
      getUnreadCount: async () => 0,
    };

    const mockUserRepo: IUserRepository = {
      findById: async () => null,
      findByUsernameOrEmail: async () => null,
      findByUsernames: async (usernames) => {
        const set = new Set(usernames.map((u) => u.toLowerCase()));
        return existingUsers.filter((u) => set.has(u.username.toLowerCase()));
      },
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    };

    const mockNotifRepo: any = {
      findNotification: async () => null,
      createNotification: async (data: any) => {
        notificationsSent.push(data);
        return 1;
      },
      updateNotification: async () => {},
    };

    const mockNotifUseCase = new CreateOrUpdateNotificationUseCase(mockNotifRepo);

    return {
      messageRepo: mockMessageRepo,
      userRepo: mockUserRepo,
      notifUseCase: mockNotifUseCase,
      createdMessages,
      notificationsSent,
    };
  };

  it('lève une ValidationError si le titre est vide', async () => {
    const { messageRepo, userRepo, notifUseCase } = createMockRepos();
    const useCase = new SendMessageUseCase(messageRepo, userRepo, notifUseCase);

    await assert.rejects(
      () =>
        useCase.execute({
          fromId: 1,
          fromUsername: 'Alice',
          title: '   ',
          content: 'Hello',
          recipients: ['Bob'],
        }),
      ValidationError
    );
  });

  it('lève une ValidationError si le contenu est vide', async () => {
    const { messageRepo, userRepo, notifUseCase } = createMockRepos();
    const useCase = new SendMessageUseCase(messageRepo, userRepo, notifUseCase);

    await assert.rejects(
      () =>
        useCase.execute({
          fromId: 1,
          fromUsername: 'Alice',
          title: 'Sujet',
          content: '   ',
          recipients: ['Bob'],
        }),
      ValidationError
    );
  });

  it('lève une ValidationError si aucun destinataire spécifié', async () => {
    const { messageRepo, userRepo, notifUseCase } = createMockRepos();
    const useCase = new SendMessageUseCase(messageRepo, userRepo, notifUseCase);

    await assert.rejects(
      () =>
        useCase.execute({
          fromId: 1,
          fromUsername: 'Alice',
          title: 'Sujet',
          content: 'Hello',
          recipients: [],
        }),
      ValidationError
    );
  });

  it('lève une ValidationError si un des destinataires est introuvable', async () => {
    const users: User[] = [
      { id: 2, username: 'Bob', mail: 'bob@test.com', avatar: '', description: '', profil: 0, titre: '', subscribe_date: '' },
    ];
    const { messageRepo, userRepo, notifUseCase } = createMockRepos(users);
    const useCase = new SendMessageUseCase(messageRepo, userRepo, notifUseCase);

    await assert.rejects(
      () =>
        useCase.execute({
          fromId: 1,
          fromUsername: 'Alice',
          title: 'Sujet',
          content: 'Hello',
          recipients: ['Bob', 'Charlie'],
        }),
      /Destinataire\(s\) introuvable\(s\) : Charlie/
    );
  });

  it('envoie un message avec succès à plusieurs destinataires et génère les notifications', async () => {
    const users: User[] = [
      { id: 2, username: 'Bob', mail: 'bob@test.com', avatar: '', description: '', profil: 0, titre: '', subscribe_date: '' },
      { id: 3, username: 'Charlie', mail: 'charlie@test.com', avatar: '', description: '', profil: 0, titre: '', subscribe_date: '' },
    ];
    const { messageRepo, userRepo, notifUseCase, createdMessages, notificationsSent } = createMockRepos(users);
    const useCase = new SendMessageUseCase(messageRepo, userRepo, notifUseCase);

    const result = await useCase.execute({
      fromId: 1,
      fromUsername: 'Alice',
      title: 'Plan de jeu pour vendredi',
      content: '<p>Rendez-vous à 20h !</p>',
      recipients: ['Bob', 'Charlie'],
    });

    assert.equal(result.messageId, 1);
    assert.equal(result.recipientsCount, 2);
    assert.equal(createdMessages.length, 1);
    assert.equal(createdMessages[0].title, 'Plan de jeu pour vendredi');
    assert.equal(createdMessages[0].recipients.length, 2);
    assert.equal(notificationsSent.length, 2);
  });
});
