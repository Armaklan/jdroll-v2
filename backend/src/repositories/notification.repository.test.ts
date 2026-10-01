import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MysqlNotificationRepository } from './notification.repository.js';
import { RawNotificationRow } from '../types/index.js';

describe('MysqlNotificationRepository', () => {
  describe('mapRowToEntity', () => {
    const buildRow = (overrides: Partial<RawNotificationRow> = {}): RawNotificationRow => ({
      id: 1,
      user_id: 2,
      title: 'Nouveau message',
      content: 'Un nouveau message a été posté',
      url: '/forum/topic/1',
      type: 'topic',
      target_id: 3,
      nb: 1,
      last_update: '2026-10-01 14:30:00',
      ...overrides,
    });

    it("passe last_update telle quelle (fuseau français, sans réinterprétation en UTC)", () => {
      const repo = new MysqlNotificationRepository();
      const entity = (repo as any).mapRowToEntity(buildRow());
      assert.equal(entity.lastUpdate, '2026-10-01 14:30:00');
    });

    it("ne génère pas un suffixe UTC qui décalerait l'heure côté frontend", () => {
      const repo = new MysqlNotificationRepository();
      const entity = (repo as any).mapRowToEntity(buildRow());
      assert.ok(!entity.lastUpdate.endsWith('Z'), `lastUpdate ne doit pas être en UTC : ${entity.lastUpdate}`);
      assert.ok(!entity.lastUpdate.includes('T'), `lastUpdate doit garder le format DB : ${entity.lastUpdate}`);
    });
  });
});
