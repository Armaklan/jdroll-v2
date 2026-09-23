import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';

export interface MarkAllForumTopicsAsReadInput {
  userId: number;
  campaignId: number | null;
}

export class MarkAllForumTopicsAsReadUseCase {
  constructor(private readonly forumRepo: IForumRepository = forumRepository) {}

  async execute(input: MarkAllForumTopicsAsReadInput): Promise<void> {
    const sections = await this.forumRepo.findSectionsByCampaignId(input.campaignId, input.userId);

    for (const section of sections) {
      for (const topic of section.topics) {
        const lastPost = await this.forumRepo.findLastPost(topic.id);
        if (lastPost) {
          await this.forumRepo.markTopicAsRead(topic.id, input.userId, lastPost.id);
        }
      }
    }
  }
}

export const markAllForumTopicsAsReadUseCase = new MarkAllForumTopicsAsReadUseCase();
