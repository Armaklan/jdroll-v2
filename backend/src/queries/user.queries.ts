import { IUserRepository, userRepository } from '../repositories/user.repository.js';
import { User } from '../types/index.js';
import { UserNotFoundError } from '../errors/domain.errors.js';

export class UserQueries {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

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
}

export const userQueries = new UserQueries();
