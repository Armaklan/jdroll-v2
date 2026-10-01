import { IAnnonceRepository, annonceRepository } from '../repositories/annonce.repository.js';
import { Annonce } from '../types/index.js';

export class AnnonceQueries {
  constructor(
    private readonly annonceRepo: IAnnonceRepository = annonceRepository
  ) {}

  /**
   * Annonces visibles à l'instant présent : dont la fenêtre
   * create_date / end_date couvre la date courante.
   * La date courante est évaluée par la base (NOW()) pour éviter
   * tout décalage de fuseau horaire entre le serveur Node et MySQL.
   */
  async getVisibleAnnonces(): Promise<Annonce[]> {
    return this.annonceRepo.findVisible();
  }
}

export const annonceQueries = new AnnonceQueries();
