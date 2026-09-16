import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface CreateTopicInput {
  sectionId: number;
  userId: number;
  userProfil?: number;
  title: string;
  stickable?: boolean;
  isPrivate?: number | boolean;
  canReadUserIds?: number[];
  isClosed?: boolean;
  firstPostContent?: string;
  persoId?: number | null;
}

export interface CreateTopicOutput {
  id: number;
  sectionId: number;
  title: string;
  stickable: boolean;
  isPrivate: number;
  isClosed: boolean;
  ordre: number;
  postId?: number;
}

export class CreateTopicUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly eventBus: IEventBus = domainEventBus,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(input: CreateTopicInput): Promise<CreateTopicOutput> {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw new ValidationError('Le titre du sujet ne peut pas être vide');
    }

    if (trimmedTitle.length > 500) {
      throw new ValidationError('Le titre du sujet ne peut pas dépasser 500 caractères');
    }

    const section = await this.forumRepo.findSectionById(input.sectionId);
    if (!section) {
      throw new SectionNotFoundError(`La section avec l'identifiant ${input.sectionId} n'existe pas`);
    }

    if (section.campagneId) {
      const isMj = await this.forumRepo.isUserCampaignMj(section.campagneId, input.userId);
      if (!isMj) {
        throw new ForbiddenError('Seul le Maître du Jeu peut créer un sujet dans cette campagne');
      }
    }

    let stickable = Boolean(input.stickable);
    let isClosed = Boolean(input.isClosed);
    if (!section.campagneId) {
      let profil = input.userProfil;
      if (profil === undefined && (stickable || isClosed)) {
        const user = await this.userRepo.findById(input.userId);
        profil = user?.profil ?? 0;
      }
      if (profil !== 2) {
        stickable = false;
        isClosed = false;
      }
    }

    const maxOrdre = await this.forumRepo.getMaxTopicOrdre(input.sectionId);
    const newOrdre = maxOrdre + 1;

    let isPrivateVal = 0;
    if (input.isPrivate === true || input.isPrivate === 1) {
      isPrivateVal = 1;
    } else if (input.isPrivate === 2) {
      isPrivateVal = 2;
    }

    const topicId = await this.forumRepo.createTopic({
      sectionId: input.sectionId,
      title: trimmedTitle,
      stickable,
      isPrivate: isPrivateVal,
      isClosed,
      ordre: newOrdre,
      canReadUserIds: isPrivateVal === 1 ? input.canReadUserIds : [],
    });

    let createdPostId: number | undefined;

    if (input.firstPostContent && input.firstPostContent.trim()) {
      createdPostId = await this.forumRepo.createPost({
        topicId,
        userId: input.userId,
        persoId: input.persoId ?? null,
        content: input.firstPostContent.trim(),
        editor: 0,
      });

      await this.forumRepo.updateTopicLastPost(topicId, createdPostId);
      await this.forumRepo.markTopicAsRead(topicId, input.userId, createdPostId);

      await this.eventBus.publish({
        name: 'PostCreated',
        postId: createdPostId,
        topicId,
        campagneId: section.campagneId,
        userId: input.userId,
        topicTitle: trimmedTitle,
        isPrivate: isPrivateVal,
      });
    }

    return {
      id: topicId,
      sectionId: input.sectionId,
      title: trimmedTitle,
      stickable,
      isPrivate: isPrivateVal,
      isClosed,
      ordre: newOrdre,
      postId: createdPostId,
    };
  }
}

export const createTopicUseCase = new CreateTopicUseCase();
