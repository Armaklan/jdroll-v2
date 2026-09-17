import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseDbDate,
  formatDate,
  formatFullDateTime,
  formatMessageDate,
  formatNotificationDate,
  formatTime,
  formatDateLabel,
} from './date.js';

describe('Date utils (French DB Timezone handling)', () => {
  describe('parseDbDate', () => {
    it('doit parser correctement une date ISO avec Z sans décalage horaire', () => {
      const d = parseDbDate('2026-09-17T14:30:00.000Z');
      assert.ok(d !== null);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8); // Septembre (0-indexed)
      assert.strictEqual(d.getDate(), 17);
      assert.strictEqual(d.getHours(), 14);
      assert.strictEqual(d.getMinutes(), 30);
      assert.strictEqual(d.getSeconds(), 0);
    });

    it('doit parser correctement une chaîne SQL datetime YYYY-MM-DD HH:mm:ss', () => {
      const d = parseDbDate('2026-09-17 14:30:45');
      assert.ok(d !== null);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8);
      assert.strictEqual(d.getDate(), 17);
      assert.strictEqual(d.getHours(), 14);
      assert.strictEqual(d.getMinutes(), 30);
      assert.strictEqual(d.getSeconds(), 45);
    });

    it('doit parser correctement une date simple YYYY-MM-DD', () => {
      const d = parseDbDate('2026-09-17');
      assert.ok(d !== null);
      assert.strictEqual(d.getFullYear(), 2026);
      assert.strictEqual(d.getMonth(), 8);
      assert.strictEqual(d.getDate(), 17);
    });

    it('doit renvoyer null pour null, undefined ou vide', () => {
      assert.strictEqual(parseDbDate(null), null);
      assert.strictEqual(parseDbDate(undefined), null);
      assert.strictEqual(parseDbDate(''), null);
      assert.strictEqual(parseDbDate('   '), null);
    });
  });

  describe('formatDate', () => {
    it('doit formater avec JJ/MM/AAAA HH:mm en conservant les heures', () => {
      const formatted = formatDate('2026-09-17T14:30:00.000Z');
      assert.ok(formatted.includes('17/09/2026'));
      assert.ok(formatted.includes('14:30'));
    });

    it('doit renvoyer la valeur par défaut pour une entrée invalide ou vide', () => {
      assert.strictEqual(formatDate(null), 'Date inconnue');
      assert.strictEqual(formatDate('', 'Aucune date'), 'Aucune date');
    });
  });

  describe('formatFullDateTime', () => {
    it('doit inclure les secondes', () => {
      const formatted = formatFullDateTime('2026-09-17T14:30:15.000Z');
      assert.ok(formatted.includes('17/09/2026'));
      assert.ok(formatted.includes('14:30:15'));
    });
  });

  describe('formatMessageDate', () => {
    it('doit formater la date du message', () => {
      const formatted = formatMessageDate('2026-09-17T14:30:00.000Z');
      assert.ok(formatted.includes('17'));
      assert.ok(formatted.includes('sept'));
      assert.ok(formatted.includes('2026'));
      assert.ok(formatted.includes('14:30'));
    });
  });

  describe('formatTime & formatDateLabel', () => {
    it('formatTime doit retourner HH:mm', () => {
      const time = formatTime('2026-09-17 14:30:00');
      assert.strictEqual(time, '14:30');
    });

    it('formatDateLabel doit identifier aujourd hui', () => {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayIso = `${today.getFullYear()}-${month}-${day}T12:00:00.000Z`;
      assert.strictEqual(formatDateLabel(todayIso), "Aujourd'hui");
    });
  });
});
