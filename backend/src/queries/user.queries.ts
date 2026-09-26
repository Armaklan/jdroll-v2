import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { IAbsenceRepository, absenceRepository } from '../repositories/absence.repository.js';
import { User, PublicUserProfile } from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

export class UserQueries {
  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly absenceRepo: IAbsenceRepository = absenceRepository
  ) {}

  /**
   * Récupère le profil d'un utilisateur par son ID (pour /api/auth/me ou consultation profil)
   * Lève une UserNotFoundError si l'utilisateur n'existe pas.
   */
  async getUserProfile(userId: number): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }
    return user;
  }

  /**
   * Récupère un utilisateur par son identifiant ou retourne null s'il n'existe pas.
   */
  async getUserById(userId: number): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  /**
   * Récupère le profil public d'un utilisateur (consultation par un autre membre) :
   * nom, avatar, description, titre et absences en cours.
   * N'expose ni le mail, ni les paramètres de notification.
   * Lève une UserNotFoundError si l'utilisateur n'existe pas.
   */
  async getPublicProfile(userId: number): Promise<PublicUserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${userId} introuvable`);
    }

    const currentAbsences = await this.absenceRepo.findCurrentByUser(userId);

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      description: user.description,
      titre: user.titre,
      profil: user.profil,
      subscribeDate: user.subscribe_date,
      birthDate: user.birthDate ?? null,
      currentAbsences,
    };
  }
}

export const userQueries = new UserQueries();
