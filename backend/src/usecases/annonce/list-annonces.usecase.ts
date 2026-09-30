import { IAnnonceRepository, annonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { ADMIN_PROFILE } from '../user/assign-user-title.usecase.js';
import { ForbiddenError } from '../../errors/domain.errors.js';

export interface ListAnnoncesInput {
  requesterProfil: number;
}

/**
 * Liste toutes les annonces (y compris expirées et planifiées) pour l'écran d'administration.
 * Réservé aux administrateurs (profil 2).
 */
export class ListAnnoncesUseCase {
  constructor(private readonly annonceRepo: IAnnonceRepository = annonceRepository) {}

  async execute(input: ListAnnoncesInput): Promise<Annonce[]> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut lister toutes les annonces');
    }

    return this.annonceRepo.findAll();
  }
}

export const listAnnoncesUseCase = new ListAnnoncesUseCase();
