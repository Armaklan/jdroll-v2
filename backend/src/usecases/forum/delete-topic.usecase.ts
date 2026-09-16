import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  TopicNotFoundError,
} from '../../errors/domain.errors.js';

export interface DeleteTopicInput {
  topicId: number;
  userId: number;
  userProfil?: number;
}

export interface DeleteTopicOutput {
  success: boolean;
  topicId: number;
}

export class DeleteTopicUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: DeleteTopicInput): Promise<DeleteTopicOutput> {
    const topic = await this.forumRepo.findTopicById(input.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${input.topicId} n'existe pas`);
    }

    if (topic.campagneId && topic.campagneId > 0) {
      const campaign = await this.campaignRepo.findById(topic.campagneId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${topic.campagneId} n'existe pas`);
      }

      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut supprimer un sujet de cette campagne');
      }
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut supprimer un sujet du forum général');
      }
    }

    await this.forumRepo.deleteTopic(input.topicId);

    return {
      success: true,
      topicId: input.topicId,
    };
  }
}

export const deleteTopicUseCase = new DeleteTopicUseCase();
