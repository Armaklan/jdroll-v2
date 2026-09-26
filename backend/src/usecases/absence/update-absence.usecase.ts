import { IAbsenceRepository, absenceRepository } from '../../repositories/absence.repository.js';
import { AbsenceNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { Absence } from '../../types/index.js';
import { validateAbsenceFields } from './declare-absence.usecase.js';

export interface UpdateAbsenceInput {
  absenceId: number;
  userId: number;
  beginDate: string;
  endDate: string;
  commentaire: string;
}

export class UpdateAbsenceUseCase {
  constructor(
    private readonly absenceRepo: IAbsenceRepository = absenceRepository
  ) {}

  async execute(input: UpdateAbsenceInput): Promise<Absence> {
    const absence = await this.absenceRepo.findById(input.absenceId);
    if (!absence) {
      throw new AbsenceNotFoundError('Absence introuvable');
    }

    if (absence.userId !== input.userId) {
      throw new ForbiddenError("Vous ne pouvez modifier que vos propres absences");
    }

    const fields = validateAbsenceFields(input.beginDate, input.endDate, input.commentaire);

    await this.absenceRepo.updateByIdAndUser(
      input.absenceId,
      input.userId,
      fields.beginDate,
      fields.endDate,
      fields.commentaire
    );

    return {
      ...absence,
      beginDate: fields.beginDate,
      endDate: fields.endDate,
      commentaire: fields.commentaire,
    };
  }
}

export const updateAbsenceUseCase = new UpdateAbsenceUseCase();
