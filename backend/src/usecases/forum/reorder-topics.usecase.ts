import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
  SectionNotFoundError,
  TopicNotFoundError,
} from '../../errors/domain.errors.js';

export interface ReorderTopicsSectionInput {
  sectionId: number;
  topicIds: number[];
}

export interface ReorderTopicsInput {
  campagneId?: number | null;
  userId: number;
  userProfil?: number;
  sections: ReorderTopicsSectionInput[];
}

export interface ReorderTopicsOutput {
  success: boolean;
}

export class ReorderTopicsUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: ReorderTopicsInput): Promise<ReorderTopicsOutput> {
    if (!Array.isArray(input.sections)) {
      throw new ValidationError('La liste des sections est invalide');
    }

    const campaignId = input.campagneId && input.campagneId > 0 ? input.campagneId : 0;

    if (campaignId > 0) {
      const campaign = await this.campaignRepo.findById(campaignId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
      }

      const isMj = await this.forumRepo.isUserCampaignMj(campaignId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut réorganiser les sujets de cette campagne');
      }

      for (const sec of input.sections) {
        const section = await this.forumRepo.findSectionById(sec.sectionId);
        if (!section) {
          throw new SectionNotFoundError(`La section avec l'identifiant ${sec.sectionId} n'existe pas`);
        }
        if (section.campagneId !== campaignId) {
          throw new ValidationError(`La section ${sec.sectionId} n'appartient pas à cette campagne`);
        }

        if (Array.isArray(sec.topicIds)) {
          for (const topicId of sec.topicIds) {
            const topic = await this.forumRepo.findTopicById(topicId);
            if (!topic) {
              throw new TopicNotFoundError(`Le sujet avec l'identifiant ${topicId} n'existe pas`);
            }
            if (topic.campagneId !== campaignId) {
              throw new ValidationError(`Le sujet ${topicId} n'appartient pas à cette campagne`);
            }
          }
        }
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut réorganiser les sujets du forum général');
      }

      for (const sec of input.sections) {
        const section = await this.forumRepo.findSectionById(sec.sectionId);
        if (!section) {
          throw new SectionNotFoundError(`La section avec l'identifiant ${sec.sectionId} n'existe pas`);
        }
        if (section.campagneId !== null && section.campagneId !== 0) {
          throw new ValidationError(`La section ${sec.sectionId} n'appartient pas au forum général`);
        }

        if (Array.isArray(sec.topicIds)) {
          for (const topicId of sec.topicIds) {
            const topic = await this.forumRepo.findTopicById(topicId);
            if (!topic) {
              throw new TopicNotFoundError(`Le sujet avec l'identifiant ${topicId} n'existe pas`);
            }
            if (topic.campagneId !== null && topic.campagneId !== 0) {
              throw new ValidationError(`Le sujet ${topicId} n'appartient pas au forum général`);
            }
          }
        }
      }
    }

    await this.forumRepo.reorderTopics(campaignId, input.sections);

    return {
      success: true,
    };
  }
}

export const reorderTopicsUseCase = new ReorderTopicsUseCase();
