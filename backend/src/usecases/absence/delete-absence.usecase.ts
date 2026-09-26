import { IAbsenceRepository, absenceRepository } from '../../repositories/absence.repository.js';
import { AbsenceNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';

export interface DeleteAbsenceInput {
  absenceId: number;
  userId: number;
}

export class DeleteAbsenceUseCase {
  constructor(
    private readonly absenceRepo: IAbsenceRepository = absenceRepository
  ) {}

  async execute(input: DeleteAbsenceInput): Promise<void> {
    const absence = await this.absenceRepo.findById(input.absenceId);
    if (!absence) {
      throw new AbsenceNotFoundError('Absence introuvable');
    }

    if (absence.userId !== input.userId) {
      throw new ForbiddenError("Vous ne pouvez supprimer que vos propres absences");
    }

    await this.absenceRepo.deleteByIdAndUser(input.absenceId, input.userId);
  }
}

export const deleteAbsenceUseCase = new DeleteAbsenceUseCase();
