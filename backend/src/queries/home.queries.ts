import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { HomeCommunityStats } from '../types/index.js';

export class HomeQueries {
  constructor(
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  /**
   * Statistiques de la communauté affichées sur la page d'accueil :
   * derniers inscrits et anniversaires à venir (jour même + 4 jours).
   */
  async getCommunityStats(): Promise<HomeCommunityStats> {
    const [latestRegistrations, upcomingBirthdays] = await Promise.all([
      this.userRepo.findLatestRegistrations(5),
      this.userRepo.findUpcomingBirthdays(4),
    ]);

    return {
      latestRegistrations,
      upcomingBirthdays,
    };
  }
}

export const homeQueries = new HomeQueries();
