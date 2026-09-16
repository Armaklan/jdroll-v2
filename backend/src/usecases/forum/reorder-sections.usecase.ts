import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
  SectionNotFoundError,
} from '../../errors/domain.errors.js';

export interface ReorderSectionsInput {
  campagneId?: number | null;
  userId: number;
  userProfil?: number;
  sectionIds: number[];
}

export interface ReorderSectionsOutput {
  success: boolean;
  sectionIds: number[];
}

export class ReorderSectionsUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: ReorderSectionsInput): Promise<ReorderSectionsOutput> {
    if (!Array.isArray(input.sectionIds) || input.sectionIds.length === 0) {
      throw new ValidationError('La liste des identifiants de sections ne peut pas être vide');
    }

    const campaignId = input.campagneId && input.campagneId > 0 ? input.campagneId : 0;

    if (campaignId > 0) {
      const campaign = await this.campaignRepo.findById(campaignId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
      }

      const isMj = await this.forumRepo.isUserCampaignMj(campaignId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut réorganiser les sections de cette campagne');
      }

      for (const sectionId of input.sectionIds) {
        const section = await this.forumRepo.findSectionById(sectionId);
        if (!section) {
          throw new SectionNotFoundError(`La section avec l'identifiant ${sectionId} n'existe pas`);
        }
        if (section.campagneId !== campaignId) {
          throw new ValidationError(`La section ${sectionId} n'appartient pas à cette campagne`);
        }
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut réorganiser les sections du forum général');
      }

      for (const sectionId of input.sectionIds) {
        const section = await this.forumRepo.findSectionById(sectionId);
        if (!section) {
          throw new SectionNotFoundError(`La section avec l'identifiant ${sectionId} n'existe pas`);
        }
        if (section.campagneId !== null && section.campagneId !== 0) {
          throw new ValidationError(`La section ${sectionId} n'appartient pas au forum général`);
        }
      }
    }

    await this.forumRepo.reorderSections(campaignId, input.sectionIds);

    return {
      success: true,
      sectionIds: input.sectionIds,
    };
  }
}

export const reorderSectionsUseCase = new ReorderSectionsUseCase();
