import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRythmeLabel,
  getRpLabel,
  getStatutLabel,
  getCampaignSortPriority,
  compareCampaignsForMyCampaigns,
} from './campaign-helpers';

describe('Campaign Helpers', () => {
  describe('getRythmeLabel', () => {
    it('devrait retourner les libellés corrects selon le rythme', () => {
      assert.strictEqual(getRythmeLabel(0), '1 post par mois');
      assert.strictEqual(getRythmeLabel(1), '1 post par semaine');
      assert.strictEqual(getRythmeLabel(2), '1 post pour 3 jours');
      assert.strictEqual(getRythmeLabel(3), '1 post par jour');
      assert.strictEqual(getRythmeLabel(4), 'Plusieurs posts par jour');
      assert.strictEqual(getRythmeLabel(99), null);
      assert.strictEqual(getRythmeLabel(null), null);
    });
  });

  describe('getRpLabel', () => {
    it('devrait retourner les libellés corrects selon le niveau RP', () => {
      assert.strictEqual(getRpLabel(0), 'Roman de gare');
      assert.strictEqual(getRpLabel(1), 'Standard');
      assert.strictEqual(getRpLabel(2), 'Théâtre');
      assert.strictEqual(getRpLabel(3), 'Cyrano');
      assert.strictEqual(getRpLabel(0, true), "Roman de gare (Peu d'exigence en terme de Roleplay)");
      assert.strictEqual(getRpLabel(99), null);
    });
  });

  describe('getStatutLabel', () => {
    it('devrait retourner le libellé correct selon le statut', () => {
      assert.strictEqual(getStatutLabel(0), 'Ouverte');
      assert.strictEqual(getStatutLabel(1), 'En pause');
      assert.strictEqual(getStatutLabel(2), 'Archivé');
      assert.strictEqual(getStatutLabel(3), 'En préparation');
      assert.strictEqual(getStatutLabel(null), 'Ouverte');
    });
  });

  describe('getCampaignSortPriority', () => {
    it('devrait assigner la priorité 1 aux campagnes en alerte', () => {
      assert.strictEqual(getCampaignSortPriority({ hasAlert: true, hasUnread: false, statut: 0 }), 1);
      assert.strictEqual(getCampaignSortPriority({ hasAlert: true, hasUnread: true, statut: 3 }), 1);
    });

    it('devrait assigner la priorité 2 aux campagnes avec des messages non lus sans alerte', () => {
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: true, statut: 0 }), 2);
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: true, statut: 3 }), 2);
    });

    it('devrait assigner la priorité 3 aux campagnes en cours (statut 0)', () => {
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: false, statut: 0 }), 3);
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: false }), 3);
    });

    it('devrait assigner la priorité 4 aux campagnes autres (en préparation, en pause, archivées)', () => {
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: false, statut: 3 }), 4); // En préparation
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: false, statut: 1 }), 4); // En pause
      assert.strictEqual(getCampaignSortPriority({ hasAlert: false, hasUnread: false, statut: 2 }), 4); // Archivée
    });
  });

  describe('compareCampaignsForMyCampaigns', () => {
    it('devrait trier selon les 4 niveaux de priorité puis par ordre alphabétique', () => {
      const campaigns = [
        { id: 1, name: 'Zorro', hasAlert: false, hasUnread: false, statut: 0 }, // P3
        { id: 2, name: 'Bob', hasAlert: true, hasUnread: false, statut: 0 }, // P1
        { id: 3, name: 'Alice', hasAlert: true, hasUnread: true, statut: 0 }, // P1
        { id: 4, name: 'Charlie', hasAlert: false, hasUnread: true, statut: 0 }, // P2
        { id: 5, name: 'Arthur', hasAlert: false, hasUnread: false, statut: 0 }, // P3
        { id: 6, name: 'Zelda (Prépa)', hasAlert: false, hasUnread: false, statut: 3 }, // P4
        { id: 7, name: 'Alpha (Prépa)', hasAlert: false, hasUnread: false, statut: 3 }, // P4
        { id: 8, name: 'Bêta (Pause)', hasAlert: false, hasUnread: false, statut: 1 }, // P4
        { id: 9, name: 'David (Non lu)', hasAlert: false, hasUnread: true, statut: 3 }, // P2 (non lu prime sur statut)
      ];

      const sorted = [...campaigns].sort(compareCampaignsForMyCampaigns);

      assert.deepStrictEqual(
        sorted.map((c) => c.name),
        [
          // Priorité 1 : alertes par ordre alphabétique
          'Alice',
          'Bob',
          // Priorité 2 : messages non lus par ordre alphabétique
          'Charlie',
          'David (Non lu)',
          // Priorité 3 : en cours restantes par ordre alphabétique
          'Arthur',
          'Zorro',
          // Priorité 4 : autres par ordre alphabétique
          'Alpha (Prépa)',
          'Bêta (Pause)',
          'Zelda (Prépa)',
        ]
      );
    });

    it('devrait gérer correctement les accents et la casse en ordre alphabétique', () => {
      const campaigns = [
        { id: 1, name: 'Éléphant', hasAlert: false, hasUnread: false, statut: 0 },
        { id: 2, name: 'epee', hasAlert: false, hasUnread: false, statut: 0 },
        { id: 3, name: 'Épée', hasAlert: false, hasUnread: false, statut: 0 },
        { id: 4, name: 'avion', hasAlert: false, hasUnread: false, statut: 0 },
      ];

      const sorted = [...campaigns].sort(compareCampaignsForMyCampaigns);

      assert.deepStrictEqual(
        sorted.map((c) => c.name),
        ['avion', 'Éléphant', 'epee', 'Épée']
      );
    });
  });
});
