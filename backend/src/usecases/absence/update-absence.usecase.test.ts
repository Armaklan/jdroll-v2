import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateAbsenceUseCase } from './update-absence.usecase.js';
import { IAbsenceRepository } from '../../repositories/absence.repository.js';
import { AbsenceNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { Absence } from '../../types/index.js';

describe('UpdateAbsenceUseCase', () => {
  const existingAbsence: Absence = {
    id: 7,
    userId: 42,
    beginDate: '2026-09-26',
    endDate: '2026-09-28',
    commentaire: 'Vacances',
  };

  const createMockRepo = (found: Absence | null = existingAbsence): IAbsenceRepository => {
    let updated: { id: number; userId: number; beginDate: string; endDate: string; commentaire: string } | null = null;
    const repo: IAbsenceRepository = {
      findByUser: async () => [],
      findById: async () => found,
      create: async () => existingAbsence,
      updateByIdAndUser: async (id, userId, beginDate, endDate, commentaire) => {
        updated = { id, userId, beginDate, endDate, commentaire };
        return true;
      },
      deleteByIdAndUser: async () => true,
      findCurrentByCampaignId: async () => [],
    };
    (repo as any).lastUpdate = () => updated;
    return repo;
  };

  it('met à jour une absence valide appartenant à son propriétaire', async () => {
    const repo = createMockRepo();
    const useCase = new UpdateAbsenceUseCase(repo);

    const result = await useCase.execute({
      absenceId: 7,
      userId: 42,
      beginDate: '2026-09-27',
      endDate: '2026-09-30',
      commentaire: 'Vacances prolongées',
    });

    assert.equal(result.beginDate, '2026-09-27');
    assert.equal(result.endDate, '2026-09-30');
    assert.equal(result.commentaire, 'Vacances prolongées');
    const last = (repo as any).lastUpdate();
    assert.equal(last.id, 7);
    assert.equal(last.userId, 42);
  });

  it('lève AbsenceNotFoundError si l absence n existe pas', async () => {
    const useCase = new UpdateAbsenceUseCase(createMockRepo(null));

    await assert.rejects(
      () =>
        useCase.execute({
          absenceId: 999,
          userId: 42,
          beginDate: '2026-09-27',
          endDate: '2026-09-30',
          commentaire: 'Vacances',
        }),
      (err: any) => err instanceof AbsenceNotFoundError
    );
  });

  it('lève ForbiddenError si l utilisateur n est pas le propriétaire', async () => {
    const useCase = new UpdateAbsenceUseCase(createMockRepo());

    await assert.rejects(
      () =>
        useCase.execute({
          absenceId: 7,
          userId: 1,
          beginDate: '2026-09-27',
          endDate: '2026-09-30',
          commentaire: 'Vacances',
        }),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('rejette une mise à jour avec une fin antérieure au début', async () => {
    const useCase = new UpdateAbsenceUseCase(createMockRepo());

    await assert.rejects(
      () =>
        useCase.execute({
          absenceId: 7,
          userId: 42,
          beginDate: '2026-09-30',
          endDate: '2026-09-27',
          commentaire: 'Vacances',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette une mise à jour sans commentaire', async () => {
    const useCase = new UpdateAbsenceUseCase(createMockRepo());

    await assert.rejects(
      () =>
        useCase.execute({
          absenceId: 7,
          userId: 42,
          beginDate: '2026-09-27',
          endDate: '2026-09-30',
          commentaire: '   ',
        }),
      (err: any) => err instanceof ValidationError
    );
  });
});
