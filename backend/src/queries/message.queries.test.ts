import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MessageQueries } from './message.queries.js';
import { IMessageRepository } from '../repositories/message.repository.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { MarkMessageReadUseCase } from '../usecases/message/mark-message-read.usecase.js';
import { MessageNotFoundError, ForbiddenError } from '../errors/domain.errors.js';
import { MessageDetail } from '../types/index.js';

describe('MessageQueries', () => {
  const createMockContext = () => {
    const markReadCalls: any[] = [];
    const mockMessage: MessageDetail = {
      id: 1,
      fromId: 10,
      fromUsername: 'Alice',
      title: 'Salutations',
      content: 'Bienvenue sur la table',
      time: '2026-09-16 10:00:00',
      statut: 0,
      recipients: [
        { id: 20, username: 'Bob', statut: 0, isRead: false },
        { id: 30, username: 'Charlie', statut: 1, isRead: true },
      ],
      isSender: false,
      isRead: false,
    };

    const mockMessageRepo: IMessageRepository = {
      createMessage: async () => 1,
      getInbox: async (userId: number) => [
        {
          id: 1,
          fromId: 10,
          fromUsername: 'Alice',
          title: 'Salutations',
          time: '2026-09-16 10:00:00',
          statut: 0,
          isRead: false,
        },
      ],
      getSent: async (userId: number) => [
        {
          id: 1,
          fromId: 10,
          fromUsername: 'Alice',
          title: 'Salutations',
          time: '2026-09-16 10:00:00',
          statut: 0,
          recipients: [
            { id: 20, username: 'Bob', statut: 0, isRead: false },
            { id: 30, username: 'Charlie', statut: 1, isRead: true },
          ],
          isRead: false,
        },
      ],
      getMessageById: async (msgId: number) => (msgId === 1 ? { ...mockMessage, recipients: mockMessage.recipients.map(r => ({ ...r })) } : null),
      getMessageRecipients: async (msgId: number) => mockMessage.recipients,
      isUserRecipient: async (msgId: number, uId: number) => mockMessage.recipients.some((r) => r.id === uId),
      isUserSender: async (msgId: number, uId: number) => mockMessage.fromId === uId,
      getRecipientStatut: async (msgId: number, uId: number) => {
        const r = mockMessage.recipients.find((rec) => rec.id === uId);
        return r ? r.statut : null;
      },
      markAsRead: async (msgId: number, uId: number) => {
        markReadCalls.push({ msgId, uId });
      },
      deleteFromInbox: async () => true,
      deleteFromSent: async () => true,
      getUnreadCount: async (userId: number) => 3,
    };

    const mockUserRepo: IUserRepository = {
      findById: async () => null,
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async (q, excludeId) => [
        { id: 2, username: 'Bob', avatar: '' },
      ],
      existsByUsernameOrEmail: async () => false,
      create: async () => ({} as any),
    };

    const markReadUseCase = new MarkMessageReadUseCase(mockMessageRepo);
    const queries = new MessageQueries(mockMessageRepo, mockUserRepo, markReadUseCase);

    return { queries, markReadCalls, mockMessage };
  };

  it('récupère la boîte de réception avec le nombre de non lus', async () => {
    const { queries } = createMockContext();
    const result = await queries.getInbox(20);

    assert.equal(result.messages.length, 1);
    assert.equal(result.unreadCount, 3);
    assert.equal(result.messages[0].title, 'Salutations');
    assert.equal(result.messages[0].isRead, false);
  });

  it('récupère la boîte des messages envoyés avec statut de lecture global', async () => {
    const { queries } = createMockContext();
    const result = await queries.getSent(10);

    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].isRead, false); // Bob n'a pas lu
    assert.equal(result.messages[0].recipients.length, 2);
  });

  it('lève MessageNotFoundError pour un message inexistant', async () => {
    const { queries } = createMockContext();
    await assert.rejects(() => queries.getMessageDetail(999, 10), MessageNotFoundError);
  });

  it('lève ForbiddenError pour un utilisateur non autorisé', async () => {
    const { queries } = createMockContext();
    await assert.rejects(() => queries.getMessageDetail(1, 999), ForbiddenError);
  });

  it('marque automatiquement le message comme lu lorsque le destinataire le consulte', async () => {
    const { queries, markReadCalls } = createMockContext();
    const message = await queries.getMessageDetail(1, 20);

    assert.equal(message.isSender, false);
    assert.equal(message.isRead, true);
    assert.equal(markReadCalls.length, 1);
    assert.equal(markReadCalls[0].msgId, 1);
    assert.equal(markReadCalls[0].uId, 20);
  });

  it("ne marque pas comme lu à nouveau si l'expéditeur consulte son message envoyé", async () => {
    const { queries, markReadCalls } = createMockContext();
    const message = await queries.getMessageDetail(1, 10);

    assert.equal(message.isSender, true);
    assert.equal(markReadCalls.length, 0);
  });

  it('recherche des utilisateurs pour le destinataire', async () => {
    const { queries } = createMockContext();
    const users = await queries.searchUsers('bo', 10);

    assert.equal(users.length, 1);
    assert.equal(users[0].username, 'Bob');
  });
});
