import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import {
  TopicNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdateTopicInput {
  topicId: number;
  userId: number;
  userProfil?: number;
  title?: string;
  stickable?: boolean;
  isPrivate?: number | boolean;
  canReadUserIds?: number[];
  isClosed?: boolean;
}

export interface UpdateTopicOutput {
  id: number;
  sectionId: number;
  title: string;
  stickable: boolean;
  isPrivate: number;
  isClosed: boolean;
  ordre: number;
}

export class UpdateTopicUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

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
    } else {
      let profil = input.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        throw new ForbiddenError('Seul un administrateur peut modifier ce sujet sur le forum général');
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

    let isPrivateVal: number | undefined;
    if (input.isPrivate !== undefined) {
      if (input.isPrivate === true || input.isPrivate === 1) {
        isPrivateVal = 1;
      } else if (input.isPrivate === 2) {
        isPrivateVal = 2;
      } else {
        isPrivateVal = 0;
      }
    }

    await this.forumRepo.updateTopic(input.topicId, {
      title: trimmedTitle,
      stickable: input.stickable,
      isPrivate: isPrivateVal,
      isClosed: input.isClosed,
      canReadUserIds: input.canReadUserIds,
    });

    return {
      id: topic.id,
      sectionId: topic.sectionId,
      title: trimmedTitle !== undefined ? trimmedTitle : topic.title,
      stickable: input.stickable !== undefined ? input.stickable : Boolean(topic.stickable),
      isPrivate: isPrivateVal !== undefined ? isPrivateVal : Number(topic.isPrivate || 0),
      isClosed: input.isClosed !== undefined ? input.isClosed : Boolean(topic.isClosed),
      ordre: topic.ordre,
    };
  }
}

export const updateTopicUseCase = new UpdateTopicUseCase();
