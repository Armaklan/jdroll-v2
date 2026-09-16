import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  SectionNotFoundError,
} from '../../errors/domain.errors.js';

export interface DeleteSectionInput {
  sectionId: number;
  userId: number;
  userProfil?: number;
}

export interface DeleteSectionOutput {
  success: boolean;
  sectionId: number;
}

export class DeleteSectionUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: DeleteSectionInput): Promise<DeleteSectionOutput> {
    const section = await this.forumRepo.findSectionById(input.sectionId);
    if (!section) {
      throw new SectionNotFoundError(`La section avec l'identifiant ${input.sectionId} n'existe pas`);
    }

    if (section.campagneId && section.campagneId > 0) {
      const campaign = await this.campaignRepo.findById(section.campagneId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${section.campagneId} n'existe pas`);
      }

      const isMj = await this.forumRepo.isUserCampaignMj(section.campagneId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut supprimer une section de cette campagne');
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut supprimer une section du forum général');
      }
    }

    await this.forumRepo.deleteSection(input.sectionId);

    return {
      success: true,
      sectionId: input.sectionId,
    };
  }
}

export const deleteSectionUseCase = new DeleteSectionUseCase();
