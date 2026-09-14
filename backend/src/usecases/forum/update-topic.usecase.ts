import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import {
  TopicNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdateTopicInput {
  topicId: number;
  userId: number;
  title?: string;
  stickable?: boolean;
  isPrivate?: boolean;
  isClosed?: boolean;
}

export interface UpdateTopicOutput {
  id: number;
  sectionId: number;
  title: string;
  stickable: boolean;
  isPrivate: boolean;
  isClosed: boolean;
  ordre: number;
}

export class UpdateTopicUseCase {
  constructor(private readonly forumRepo: IForumRepository = forumRepository) {}

  async execute(input: UpdateTopicInput): Promise<UpdateTopicOutput> {
    const topic = await this.forumRepo.findTopicById(input.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${input.topicId} n'existe pas`);
    }

    if (topic.campagneId !== null && topic.campagneId !== undefined) {
      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut modifier ce sujet');
      }
    }

    let trimmedTitle: string | undefined;
    if (input.title !== undefined) {
      trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new ValidationError('Le titre du sujet ne peut pas être vide');
      }
      if (trimmedTitle.length > 500) {
        throw new ValidationError('Le titre du sujet ne peut pas dépasser 500 caractères');
      }
    }

    await this.forumRepo.updateTopic(input.topicId, {
      title: trimmedTitle,
      stickable: input.stickable,
      isPrivate: input.isPrivate,
      isClosed: input.isClosed,
    });

    return {
      id: topic.id,
      sectionId: topic.sectionId,
      title: trimmedTitle !== undefined ? trimmedTitle : topic.title,
      stickable: input.stickable !== undefined ? input.stickable : Boolean(topic.stickable),
      isPrivate: input.isPrivate !== undefined ? input.isPrivate : Boolean(topic.isPrivate),
      isClosed: input.isClosed !== undefined ? input.isClosed : Boolean(topic.isClosed),
      ordre: topic.ordre,
    };
  }
}

export const updateTopicUseCase = new UpdateTopicUseCase();
