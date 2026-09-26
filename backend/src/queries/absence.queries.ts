import { IAbsenceRepository, absenceRepository } from '../repositories/absence.repository.js';
import { Absence } from '../types/index.js';

export class AbsenceQueries {
  constructor(
    private readonly absenceRepo: IAbsenceRepository = absenceRepository
  ) {}

  async getMyAbsences(userId: number): Promise<Absence[]> {
    return this.absenceRepo.findByUser(userId);
  }
}

export const absenceQueries = new AbsenceQueries();
