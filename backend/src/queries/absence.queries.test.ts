import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AbsenceQueries } from './absence.queries.js';
import { IAbsenceRepository } from '../repositories/absence.repository.js';
import { Absence } from '../types/index.js';

describe('AbsenceQueries', () => {
  const myAbsences: Absence[] = [
    {
      id: 1,
      userId: 42,
      beginDate: '2026-09-26',
      endDate: '2026-09-28',
      commentaire: 'Vacances',
    },
  ];

  const mockRepo: IAbsenceRepository = {
    findByUser: async (userId: number) => (userId === 42 ? myAbsences : []),
    findById: async () => null,
    create: async () => myAbsences[0],
    deleteByIdAndUser: async () => true,
    updateByIdAndUser: async () => true,
    findCurrentByCampaignId: async () => [],
  };

  it('retourne les absences de l utilisateur', async () => {
    const queries = new AbsenceQueries(mockRepo);

    const result = await queries.getMyAbsences(42);

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 1);
    assert.equal(result[0].commentaire, 'Vacances');
  });

  it('retourne une liste vide pour un utilisateur sans absence', async () => {
    const queries = new AbsenceQueries(mockRepo);

    const result = await queries.getMyAbsences(1);

    assert.equal(result.length, 0);
  });
});
