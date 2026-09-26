import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeclareAbsenceUseCase } from './declare-absence.usecase.js';
import { IAbsenceRepository } from '../../repositories/absence.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { Absence } from '../../types/index.js';

describe('DeclareAbsenceUseCase', () => {
  const createMockRepo = (created: Absence[] = []): IAbsenceRepository => {
    return {
      findByUser: async () => [],
      findById: async () => null,
      create: async (userId, beginDate, endDate, commentaire) => {
        const absence: Absence = {
          id: created.length + 1,
          userId,
          beginDate,
          endDate,
          commentaire,
        };
        created.push(absence);
        return absence;
      },
      deleteByIdAndUser: async () => true,
      updateByIdAndUser: async () => true,
      findCurrentByCampaignId: async () => [],
    };
  };

  it('crée une absence valide avec le commentaire trimé', async () => {
    const created: Absence[] = [];
    const useCase = new DeclareAbsenceUseCase(createMockRepo(created));

    const result = await useCase.execute({
      userId: 42,
      beginDate: '2026-09-26',
      endDate: '2026-09-28',
      commentaire: '  Vacances en famille  ',
    });

    assert.equal(result.id, 1);
    assert.equal(result.userId, 42);
    assert.equal(result.beginDate, '2026-09-26');
    assert.equal(result.endDate, '2026-09-28');
    assert.equal(result.commentaire, 'Vacances en famille');
    assert.equal(created.length, 1);
  });

  it('rejette une absence sans date de début', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: '',
          endDate: '2026-09-28',
          commentaire: 'Absence',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette une absence avec une date de début invalide', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: 'pas-une-date',
          endDate: '2026-09-28',
          commentaire: 'Absence',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette une absence sans date de fin', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: '2026-09-26',
          endDate: '',
          commentaire: 'Absence',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette une absence dont la fin est antérieure au début', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: '2026-09-28',
          endDate: '2026-09-26',
          commentaire: 'Absence',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette une absence sans commentaire', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: '2026-09-26',
          endDate: '2026-09-28',
          commentaire: '   ',
        }),
      (err: any) => err instanceof ValidationError
    );
  });

  it('rejette un commentaire de plus de 200 caractères', async () => {
    const useCase = new DeclareAbsenceUseCase(createMockRepo());
    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          beginDate: '2026-09-26',
          endDate: '2026-09-28',
          commentaire: 'a'.repeat(201),
        }),
      (err: any) => err instanceof ValidationError
    );
  });
});
