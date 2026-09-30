import { IAnnonceRepository, annonceRepository } from '../repositories/annonce.repository.js';
import { Annonce } from '../types/index.js';

export class AnnonceQueries {
  constructor(
    private readonly annonceRepo: IAnnonceRepository = annonceRepository
  ) {}

  /**
   * Annonces visibles à l'instant présent : dont la fenêtre
   * create_date / end_date couvre la date courante.
   */
  async getVisibleAnnonces(): Promise<Annonce[]> {
    return this.annonceRepo.findVisible(new Date());
  }
}

export const annonceQueries = new AnnonceQueries();
