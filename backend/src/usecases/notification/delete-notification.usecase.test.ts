import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteNotificationUseCase } from './delete-notification.usecase.js';
import { DeleteAllNotificationsUseCase } from './delete-all-notifications.usecase.js';
import { NotificationQueries } from '../../queries/notification.queries.js';
import { INotificationRepository } from '../../repositories/notification.repository.js';
import { NotificationItem } from '../../types/index.js';
import { ValidationError } from '../../errors/domain.errors.js';

describe('Notification Deletion and Queries', () => {
  let deleteOneUseCase: DeleteNotificationUseCase;
  let deleteAllUseCase: DeleteAllNotificationsUseCase;
  let queries: NotificationQueries;
  let notifications: NotificationItem[];

  beforeEach(() => {
    notifications = [
      {
        id: 1,
        userId: 10,
        title: 'Notif 1',
        content: 'Content 1',
        url: '/topics/1',
        type: 'topic',
        targetId: 1,
        nb: 1,
        lastUpdate: '2026-09-15T10:00:00.000Z',
      },
      {
        id: 2,
        userId: 10,
        title: 'Notif 2',
        content: 'Content 2',
        url: '/campaigns/5/dice',
        type: 'dice',
        targetId: 5,
        nb: 3,
        lastUpdate: '2026-09-15T11:00:00.000Z',
      },
      {
        id: 3,
        userId: 20,
        title: 'Notif Other User',
        content: 'Content',
        url: '/topics/2',
        type: 'topic',
        targetId: 2,
        nb: 1,
        lastUpdate: '2026-09-15T12:00:00.000Z',
      },
    ];

    const mockRepo: INotificationRepository = {
      findByUserId: async (userId: number) => notifications.filter((n) => n.userId === userId),
      countByUserId: async (userId: number) => notifications.filter((n) => n.userId === userId).length,
      findNotification: async () => null,
      createNotification: async () => 1,
      updateNotification: async () => {},
      deleteNotification: async (id: number, userId: number) => {
        const idx = notifications.findIndex((n) => n.id === id && n.userId === userId);
        if (idx >= 0) {
          notifications.splice(idx, 1);
          return true;
        }
        return false;
      },
      deleteAllByUserId: async (userId: number) => {
        const before = notifications.length;
        notifications = notifications.filter((n) => n.userId !== userId);
        return before - notifications.length;
      },
    };

    deleteOneUseCase = new DeleteNotificationUseCase(mockRepo);
    deleteAllUseCase = new DeleteAllNotificationsUseCase(mockRepo);
    queries = new NotificationQueries(mockRepo);
  });

  it('should list notifications for a user', async () => {
    const result = await queries.getUserNotifications(10);
    assert.equal(result.total, 2);
    assert.equal(result.notifications.length, 2);
    assert.equal(result.notifications[0].title, 'Notif 1');
  });

  it('should throw error on invalid user id for queries', async () => {
    await assert.rejects(() => queries.getUserNotifications(0), ValidationError);
  });

  it('should delete a specific notification for user', async () => {
    const success = await deleteOneUseCase.execute({ notificationId: 1, userId: 10 });
    assert.equal(success, true);
    assert.equal(notifications.length, 2);
    assert.equal(notifications.find((n) => n.id === 1), undefined);
  });

  it('should not delete a notification if owned by another user', async () => {
    const success = await deleteOneUseCase.execute({ notificationId: 3, userId: 10 });
    assert.equal(success, false);
    assert.equal(notifications.length, 3);
  });

  it('should delete all notifications for a user', async () => {
    const count = await deleteAllUseCase.execute({ userId: 10 });
    assert.equal(count, 2);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].userId, 20);
  });
});
