import { IAnnonceRepository, annonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { ADMIN_PROFILE } from '../user/assign-user-title.usecase.js';
import { DomainError, ForbiddenError } from '../../errors/domain.errors.js';

export interface CreateAnnonceInput {
  requesterProfil: number;
  title: string;
  content: string;
  endDate: string;
}

/**
 * Crée une annonce éditoriale affichée entre sa date de création et sa date de fin.
 * Réservé aux administrateurs (profil 2).
 */
export class CreateAnnonceUseCase {
  constructor(private readonly annonceRepo: IAnnonceRepository = annonceRepository) {}

  async execute(input: CreateAnnonceInput): Promise<Annonce> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut créer une annonce');
    }

    this.validate(input.title, input.content, input.endDate);

    return this.annonceRepo.create(input.title, input.content, input.endDate);
  }

  private validate(title: string, content: string, endDate: string): void {
    if (!title || title.trim().length === 0) {
      throw new DomainError('Le titre de l\'annonce est obligatoire');
    }
    if (!content || content.trim().length === 0) {
      throw new DomainError('Le contenu de l\'annonce est obligatoire');
    }
    const parsedEndDate = new Date(endDate.replace(' ', 'T'));
    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new DomainError('La date de fin de l\'annonce est invalide');
    }
    if (parsedEndDate.getTime() <= Date.now()) {
      throw new DomainError('La date de fin de l\'annonce doit être dans le futur');
    }
  }
}

export const createAnnonceUseCase = new CreateAnnonceUseCase();
