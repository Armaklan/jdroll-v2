import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MarkMessageReadUseCase } from './mark-message-read.usecase.js';
import { IMessageRepository } from '../../repositories/message.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';

describe('MarkMessageReadUseCase', () => {
  it('lève une ValidationError si identifiant invalide', async () => {
    const mockRepo: IMessageRepository = {
      createMessage: async () => 1,
      getInbox: async () => [],
      getSent: async () => [],
      getMessageById: async () => null,
      getMessageRecipients: async () => [],
      isUserRecipient: async () => true,
      isUserSender: async () => false,
      getRecipientStatut: async () => null,
      markAsRead: async () => {},
      deleteFromInbox: async () => true,
      deleteFromSent: async () => true,
      getUnreadCount: async () => 0,
    };
    const useCase = new MarkMessageReadUseCase(mockRepo);

    await assert.rejects(() => useCase.execute({ messageId: 0, userId: 1 }), ValidationError);
    await assert.rejects(() => useCase.execute({ messageId: 1, userId: 0 }), ValidationError);
  });

  it('appelle markAsRead sur le repository avec succès', async () => {
    let called = false;
    const mockRepo: IMessageRepository = {
      createMessage: async () => 1,
      getInbox: async () => [],
      getSent: async () => [],
      getMessageById: async () => null,
      getMessageRecipients: async () => [],
      isUserRecipient: async () => true,
      isUserSender: async () => false,
      getRecipientStatut: async () => null,
      markAsRead: async (msgId, uId) => {
        if (msgId === 10 && uId === 5) {
          called = true;
        }
      },
      deleteFromInbox: async () => true,
      deleteFromSent: async () => true,
      getUnreadCount: async () => 0,
    };
    const useCase = new MarkMessageReadUseCase(mockRepo);

    await useCase.execute({ messageId: 10, userId: 5 });
    assert.equal(called, true);
  });
});
