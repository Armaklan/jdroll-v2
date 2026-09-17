import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { TopicNotFoundError } from '../../errors/domain.errors.js';

export interface DeleteDraftDTO {
  topicId: number;
  userId: number;
}

export class DeleteDraftUseCase {
  constructor(private readonly forumRepo: IForumRepository = forumRepository) {}

  async execute(dto: DeleteDraftDTO): Promise<void> {
    const topic = await this.forumRepo.findTopicById(dto.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${dto.topicId} n'existe pas`);
    }

    await this.forumRepo.deleteDraft(dto.topicId, dto.userId);
  }
}

export const deleteDraftUseCase = new DeleteDraftUseCase();
