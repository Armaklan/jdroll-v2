import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { User } from '../../types/index.js';
import { ForbiddenError, UserNotFoundError, ValidationError } from '../../errors/domain.errors.js';

export const ADMIN_PROFILE = 2;

const MAX_TITLE_LENGTH = 300;

export interface AssignUserTitleInput {
  requesterProfil: number;
  userId: number;
  titre: string;
}

/**
 * Affecte un titre à un utilisateur.
 * Réservé aux administrateurs (profil 2).
 * Un titre vide permet de retirer le titre courant.
 */
export class AssignUserTitleUseCase {
  constructor(private readonly userRepo: IUserRepository = userRepository) {}

  async execute(input: AssignUserTitleInput): Promise<User> {
    if (input.requesterProfil !== ADMIN_PROFILE) {
      throw new ForbiddenError('Seul un administrateur peut affecter un titre');
    }

    if (input.titre.trim().length > MAX_TITLE_LENGTH) {
      throw new ValidationError(`Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères`);
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${input.userId} introuvable`);
    }

    return this.userRepo.updateProfile(input.userId, { titre: input.titre.trim() });
  }
}

export const assignUserTitleUseCase = new AssignUserTitleUseCase();
