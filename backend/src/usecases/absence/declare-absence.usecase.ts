import { IAbsenceRepository, absenceRepository } from '../../repositories/absence.repository.js';
import { ValidationError } from '../../errors/domain.errors.js';
import { Absence } from '../../types/index.js';

export interface DeclareAbsenceInput {
  userId: number;
  beginDate: string;
  endDate: string;
  commentaire: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

/**
 * Validation commune des champs d'une absence (partagée entre création et modification)
 */
export function validateAbsenceFields(beginDateInput: string, endDateInput: string, commentaireInput: string): {
  beginDate: string;
  endDate: string;
  commentaire: string;
} {
  const beginDate = (beginDateInput || '').trim();
  if (!isValidDate(beginDate)) {
    throw new ValidationError('La date de début est obligatoire et doit être au format YYYY-MM-DD');
  }

  const endDate = (endDateInput || '').trim();
  if (!isValidDate(endDate)) {
    throw new ValidationError('La date de fin est obligatoire et doit être au format YYYY-MM-DD');
  }

  if (endDate < beginDate) {
    throw new ValidationError('La date de fin ne peut pas être antérieure à la date de début');
  }

  const commentaire = (commentaireInput || '').trim();
  if (!commentaire) {
    throw new ValidationError('Le commentaire est obligatoire');
  }
  if (commentaire.length > 200) {
    throw new ValidationError('Le commentaire ne peut pas dépasser 200 caractères');
  }

  return { beginDate, endDate, commentaire };
}

export class DeclareAbsenceUseCase {
  constructor(
    private readonly absenceRepo: IAbsenceRepository = absenceRepository
  ) {}

  async execute(input: DeclareAbsenceInput): Promise<Absence> {
    const fields = validateAbsenceFields(input.beginDate, input.endDate, input.commentaire);

    return this.absenceRepo.create(input.userId, fields.beginDate, fields.endDate, fields.commentaire);
  }
}

export const declareAbsenceUseCase = new DeclareAbsenceUseCase();
