import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteMessageUseCase } from './delete-message.usecase.js';
import { IMessageRepository } from '../../repositories/message.repository.js';
import { ForbiddenError, ValidationError } from '../../errors/domain.errors.js';

describe('DeleteMessageUseCase', () => {
  const createMockMessageRepo = () => {
    let inboxDeleted = false;
    let sentDeleted = false;

    const mockRepo: IMessageRepository = {
      createMessage: async () => 1,
      getInbox: async () => [],
      getSent: async () => [],
      getMessageById: async () => null,
      getMessageRecipients: async () => [],
      isUserRecipient: async (msgId, uId) => msgId === 10 && uId === 2,
      isUserSender: async (msgId, uId) => msgId === 10 && uId === 1,
      getRecipientStatut: async () => null,
      markAsRead: async () => {},
      deleteFromInbox: async (msgId, uId) => {
        if (msgId === 10 && uId === 2) {
          inboxDeleted = true;
          return true;
        }
        return false;
      },
      deleteFromSent: async (msgId, uId) => {
        if (msgId === 10 && uId === 1) {
          sentDeleted = true;
          return true;
        }
        return false;
      },
      getUnreadCount: async () => 0,
    };

    return {
      repo: mockRepo,
      wasInboxDeleted: () => inboxDeleted,
      wasSentDeleted: () => sentDeleted,
    };
  };

  it('lève une ValidationError si les paramètres sont invalides', async () => {
    const { repo } = createMockMessageRepo();
    const useCase = new DeleteMessageUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ messageId: 0, userId: 1, box: 'inbox' }),
      ValidationError
    );
  });

  it('supprime un message de la boîte de réception pour le destinataire sans impacter autrui', async () => {
    const { repo, wasInboxDeleted } = createMockMessageRepo();
    const useCase = new DeleteMessageUseCase(repo);

    const result = await useCase.execute({ messageId: 10, userId: 2, box: 'inbox' });
    assert.equal(result, true);
    assert.equal(wasInboxDeleted(), true);
  });

  it('interdit la suppression de la boîte de réception à un non-destinataire', async () => {
    const { repo } = createMockMessageRepo();
    const useCase = new DeleteMessageUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ messageId: 10, userId: 99, box: 'inbox' }),
      ForbiddenError
    );
  });

  it("supprime un message de la boîte d'envoi pour l'expéditeur sans impacter autrui", async () => {
    const { repo, wasSentDeleted } = createMockMessageRepo();
    const useCase = new DeleteMessageUseCase(repo);

    const result = await useCase.execute({ messageId: 10, userId: 1, box: 'sent' });
    assert.equal(result, true);
    assert.equal(wasSentDeleted(), true);
  });

  it("interdit la suppression de la boîte d'envoi à un non-expéditeur", async () => {
    const { repo } = createMockMessageRepo();
    const useCase = new DeleteMessageUseCase(repo);

    await assert.rejects(
      () => useCase.execute({ messageId: 10, userId: 2, box: 'sent' }),
      ForbiddenError
    );
  });
});
