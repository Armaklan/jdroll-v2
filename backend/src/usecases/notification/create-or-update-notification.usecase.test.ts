import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateOrUpdateNotificationUseCase } from './create-or-update-notification.usecase.js';
import { INotificationRepository, CreateNotificationData, UpdateNotificationData } from '../../repositories/notification.repository.js';
import { NotificationItem } from '../../types/index.js';
import { ValidationError } from '../../errors/domain.errors.js';

describe('CreateOrUpdateNotificationUseCase', () => {
  let useCase: CreateOrUpdateNotificationUseCase;
  let mockRepo: INotificationRepository;
  let notifications: NotificationItem[];

  beforeEach(() => {
    notifications = [];

    mockRepo = {
      findByUserId: async (userId: number) => notifications.filter((n) => n.userId === userId),
      countByUserId: async (userId: number) => notifications.filter((n) => n.userId === userId).length,
      findNotification: async (userId: number, type: string, targetId: number) => {
        return notifications.find((n) => n.userId === userId && n.type === type && n.targetId === targetId) || null;
      },
      createNotification: async (data: CreateNotificationData) => {
        const id = notifications.length + 1;
        notifications.push({
          id,
          userId: data.userId,
          title: data.title,
          content: data.content,
          url: data.url,
          type: data.type,
          targetId: data.targetId,
          nb: 1,
          lastUpdate: new Date().toISOString(),
        });
        return id;
      },
      updateNotification: async (id: number, data: UpdateNotificationData) => {
        const item = notifications.find((n) => n.id === id);
        if (item) {
          if (data.nbIncrement) item.nb += 1;
          if (data.title !== undefined) item.title = data.title;
          if (data.content !== undefined) item.content = data.content;
          if (data.url !== undefined) item.url = data.url;
          item.lastUpdate = new Date().toISOString();
        }
      },
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

    useCase = new CreateOrUpdateNotificationUseCase(mockRepo);
  });

  it('should throw ValidationError if userId is invalid', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 0,
          title: 'Test',
          content: 'Test content',
          url: '/test',
          type: 'topic',
          targetId: 1,
        }),
      ValidationError
    );
  });

  it('should create a new notification when not existing', async () => {
    await useCase.execute({
      userId: 5,
      title: 'Mon Sujet',
      content: 'Nouveau message dans le sujet',
      url: '/topics/12',
      type: 'topic',
      targetId: 12,
    });

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].userId, 5);
    assert.equal(notifications[0].title, 'Mon Sujet');
    assert.equal(notifications[0].nb, 1);
    assert.equal(notifications[0].type, 'topic');
    assert.equal(notifications[0].targetId, 12);
  });

  it('should update and increment nb when notification already exists for user and target', async () => {
    await useCase.execute({
      userId: 5,
      title: 'Mon Sujet',
      content: 'Nouveau message 1',
      url: '/topics/12',
      type: 'topic',
      targetId: 12,
    });

    await useCase.execute({
      userId: 5,
      title: 'Mon Sujet Modifié',
      content: 'Nouveau message 2',
      url: '/topics/12',
      type: 'topic',
      targetId: 12,
    });

    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].title, 'Mon Sujet Modifié');
    assert.equal(notifications[0].content, 'Nouveau message 2');
    assert.equal(notifications[0].nb, 2);
  });
});
