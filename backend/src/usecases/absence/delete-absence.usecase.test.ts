import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteAbsenceUseCase } from './delete-absence.usecase.js';
import { IAbsenceRepository } from '../../repositories/absence.repository.js';
import { AbsenceNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { Absence } from '../../types/index.js';

describe('DeleteAbsenceUseCase', () => {
  const absence: Absence = {
    id: 7,
    userId: 42,
    beginDate: '2026-09-26',
    endDate: '2026-09-28',
    commentaire: 'Vacances',
  };

  const createMockRepo = (found: Absence | null = absence): IAbsenceRepository => {
    let deletedId: number | null = null;
    const repo: IAbsenceRepository = {
      findByUser: async () => [],
      findById: async () => found,
      create: async () => absence,
      deleteByIdAndUser: async (id) => {
        deletedId = id;
        return true;
      },
      updateByIdAndUser: async () => true,
      findCurrentByCampaignId: async () => [],
    };
    (repo as any).lastDeletedId = () => deletedId;
    return repo;
  };

  it('supprime une absence appartenant à son propriétaire', async () => {
    const repo = createMockRepo();
    const useCase = new DeleteAbsenceUseCase(repo);

    await useCase.execute({ absenceId: 7, userId: 42 });

    assert.equal((repo as any).lastDeletedId(), 7);
  });

  it('lève AbsenceNotFoundError si l absence n existe pas', async () => {
    const useCase = new DeleteAbsenceUseCase(createMockRepo(null));

    await assert.rejects(
      () => useCase.execute({ absenceId: 999, userId: 42 }),
      (err: any) => err instanceof AbsenceNotFoundError
    );
  });

  it('lève ForbiddenError si l utilisateur n est pas le propriétaire', async () => {
    const useCase = new DeleteAbsenceUseCase(createMockRepo(absence));

    await assert.rejects(
      () => useCase.execute({ absenceId: 7, userId: 1 }),
      (err: any) => err instanceof ForbiddenError
    );
  });
});
