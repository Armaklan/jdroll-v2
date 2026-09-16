import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdateSectionInput {
  sectionId: number;
  userId: number;
  userProfil?: number;
  title?: string;
  defaultCollapse?: boolean;
  banniere?: string;
}

export interface UpdateSectionOutput {
  id: number;
  campagneId: number | null;
  title: string;
  ordre: number;
  defaultCollapse: boolean;
  banniere: string;
}

export class UpdateSectionUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: UpdateSectionInput): Promise<UpdateSectionOutput> {
    const section = await this.forumRepo.findSectionById(input.sectionId);
    if (!section) {
      throw new SectionNotFoundError(`La section avec l'identifiant ${input.sectionId} n'existe pas`);
    }

    if (section.campagneId !== null && section.campagneId !== undefined) {
      const isMj = await this.forumRepo.isUserCampaignMj(section.campagneId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut modifier cette section');
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut modifier une section du forum général');
      }
    }

    let trimmedTitle: string | undefined;
    if (input.title !== undefined) {
      trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new ValidationError('Le titre de la section ne peut pas être vide');
      }
      if (trimmedTitle.length > 500) {
        throw new ValidationError('Le titre de la section ne peut pas dépasser 500 caractères');
      }
    }

    await this.forumRepo.updateSection(input.sectionId, {
      title: trimmedTitle,
      defaultCollapse: input.defaultCollapse,
      banniere: input.banniere,
    });

    return {
      id: section.id,
      campagneId: section.campagneId,
      title: trimmedTitle !== undefined ? trimmedTitle : section.title,
      ordre: section.ordre,
      defaultCollapse: input.defaultCollapse !== undefined ? input.defaultCollapse : section.defaultCollapse,
      banniere: input.banniere !== undefined ? input.banniere : section.banniere,
    };
  }
}

export const updateSectionUseCase = new UpdateSectionUseCase();
