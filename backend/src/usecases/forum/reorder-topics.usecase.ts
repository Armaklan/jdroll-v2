import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
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
  campagneId: number;
  userId: number;
  sections: ReorderTopicsSectionInput[];
}

export interface ReorderTopicsOutput {
  success: boolean;
}

export class ReorderTopicsUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(input: ReorderTopicsInput): Promise<ReorderTopicsOutput> {
    if (!Array.isArray(input.sections)) {
      throw new ValidationError('La liste des sections est invalide');
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    const isMj = await this.forumRepo.isUserCampaignMj(input.campagneId, input.userId);
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut réorganiser les sujets de cette campagne');
    }

    for (const sec of input.sections) {
      const section = await this.forumRepo.findSectionById(sec.sectionId);
      if (!section) {
        throw new SectionNotFoundError(`La section avec l'identifiant ${sec.sectionId} n'existe pas`);
      }
      if (section.campagneId !== input.campagneId) {
        throw new ValidationError(`La section ${sec.sectionId} n'appartient pas à cette campagne`);
      }

      if (Array.isArray(sec.topicIds)) {
        for (const topicId of sec.topicIds) {
          const topic = await this.forumRepo.findTopicById(topicId);
          if (!topic) {
            throw new TopicNotFoundError(`Le sujet avec l'identifiant ${topicId} n'existe pas`);
          }
          if (topic.campagneId !== input.campagneId) {
            throw new ValidationError(`Le sujet ${topicId} n'appartient pas à cette campagne`);
          }
        }
      }
    }

    await this.forumRepo.reorderTopics(input.campagneId, input.sections);

    return {
      success: true,
    };
  }
}

export const reorderTopicsUseCase = new ReorderTopicsUseCase();
