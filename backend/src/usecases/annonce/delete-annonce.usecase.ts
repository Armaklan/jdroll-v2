import { IAnnonceRepository, annonceRepository } from '../../repositories/annonce.repository.js';
import { ADMIN_PROFILE } from '../user/assign-user-title.usecase.js';
import { AnnonceNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';

export interface DeleteAnnonceInput {
  requesterProfil: number;
  id: number;
}

/**
 * Supprime définitivement une annonce.
 * Réservé aux administrateurs (profil 2).
 */
export class DeleteAnnonceUseCase {
  constructor(private readonly annonceRepo: IAnnonceRepository = annonceRepository) {}

  async execute(input: DeleteAnnonceInput): Promise<void> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut supprimer une annonce');
    }

    const annonce = await this.annonceRepo.findById(input.id);
    if (!annonce) {
      throw new AnnonceNotFoundError(`Annonce ${input.id} introuvable`);
    }

    const deleted = await this.annonceRepo.delete(input.id);
    if (!deleted) {
      throw new AnnonceNotFoundError(`Annonce ${input.id} introuvable`);
    }
  }
}

export const deleteAnnonceUseCase = new DeleteAnnonceUseCase();
