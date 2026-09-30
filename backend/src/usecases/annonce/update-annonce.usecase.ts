import { IAnnonceRepository, annonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { ADMIN_PROFILE } from '../user/assign-user-title.usecase.js';
import { AnnonceNotFoundError, DomainError, ForbiddenError } from '../../errors/domain.errors.js';

export interface UpdateAnnonceInput {
  requesterProfil: number;
  id: number;
  title: string;
  content: string;
  endDate: string;
}

/**
 * Modifie une annonce (titre, contenu, date de fin).
 * La date de création est gérée par la base de données.
 * Réservé aux administrateurs (profil 2).
 */
export class UpdateAnnonceUseCase {
  constructor(private readonly annonceRepo: IAnnonceRepository = annonceRepository) {}

  async execute(input: UpdateAnnonceInput): Promise<Annonce> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut modifier une annonce');
    }

    this.validate(input.title, input.content, input.endDate);

    const annonce = await this.annonceRepo.findById(input.id);
    if (!annonce) {
      throw new AnnonceNotFoundError(`Annonce ${input.id} introuvable`);
    }

    const updated = await this.annonceRepo.update(input.id, input.title, input.content, input.endDate);
    if (!updated) {
      throw new AnnonceNotFoundError(`Annonce ${input.id} introuvable`);
    }

    return {
      ...annonce,
      title: input.title,
      content: input.content,
      endDate: input.endDate,
    };
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

export const updateAnnonceUseCase = new UpdateAnnonceUseCase();
