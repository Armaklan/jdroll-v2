import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { HomeCommunityStats } from '../types/index.js';

export class HomeQueries {
  constructor(
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  /**
   * Statistiques de la communauté affichées sur la page d'accueil :
   * derniers inscrits et anniversaires du jour.
   */
  async getCommunityStats(): Promise<HomeCommunityStats> {
    const [latestRegistrations, todayBirthdays] = await Promise.all([
      this.userRepo.findLatestRegistrations(5),
      this.userRepo.findTodayBirthdays(),
    ]);

    return {
      latestRegistrations,
      todayBirthdays,
    };
  }
}

export const homeQueries = new HomeQueries();
