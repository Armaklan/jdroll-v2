import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { ForumPost } from '../../types/index.js';
import {
  PostNotFoundError,
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdatePostDTO {
  postId: number;
  userId: number;
  userProfil?: number;
  content: string;
  persoId?: number | null;
}

export class UpdatePostUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly userRepo: IUserRepository = userRepository
  ) {}

  async execute(dto: UpdatePostDTO): Promise<ForumPost> {
    const rawContent = (dto.content || '').trim();
    const textOnly = rawContent.replace(/<[^>]*>/g, '').trim();

    if (!rawContent || (!textOnly && !rawContent.includes('<img') && !rawContent.includes('<hr'))) {
      throw new ValidationError('Le contenu du message ne peut pas être vide');
    }

    const post = await this.forumRepo.getPostById(dto.postId, dto.userId);
    if (!post) {
      throw new PostNotFoundError(`Le message avec l'identifiant ${dto.postId} n'existe pas`);
    }

    const topic = await this.forumRepo.findTopicById(post.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${post.topicId} n'existe pas`);
    }

    let finalPersoId: number | null = post.perso?.id ?? null;

    if (topic.campagneId && topic.campagneId > 0) {
      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, dto.userId);

      if (isMj) {
        if (dto.persoId !== undefined) {
          if (dto.persoId !== null) {
            const perso = await this.forumRepo.findPersoById(dto.persoId);
            if (!perso || perso.campagneId !== topic.campagneId) {
              throw new ValidationError("Ce personnage n'appartient pas à cette campagne");
            }
            finalPersoId = perso.id;
          } else {
            finalPersoId = null;
          }
        }
      } else {
        if (post.user.id !== dto.userId) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à modifier ce message");
        }

        if (Boolean(topic.isClosed)) {
          throw new TopicClosedError('Ce sujet est fermé');
        }

        if (dto.persoId !== undefined) {
          if (dto.persoId !== null) {
            const perso = await this.forumRepo.findPersoById(dto.persoId);
            if (!perso || perso.campagneId !== topic.campagneId) {
              throw new ValidationError("Ce personnage n'appartient pas à cette campagne");
            }
            if (perso.userId !== dto.userId) {
              throw new ForbiddenError("Ce personnage ne vous est pas assigné");
            }
            finalPersoId = perso.id;
          } else {
            finalPersoId = null;
          }
        }
      }
    } else {
      // Forum Général
      let profil = dto.userProfil;
      if (profil === undefined) {
        const user = await this.userRepo.findById(dto.userId);
        profil = user?.profil ?? 0;
      }

      const isAdmin = profil === 2;

      if (!isAdmin) {
        if (post.user.id !== dto.userId) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à modifier ce message");
        }

        if (Boolean(topic.isClosed)) {
          throw new TopicClosedError('Ce sujet est fermé');
        }
      }

      finalPersoId = null;
    }

    await this.forumRepo.updatePost(dto.postId, {
      content: dto.content,
      persoId: finalPersoId,
    });

    const updatedPost = await this.forumRepo.getPostById(dto.postId, dto.userId);
    if (!updatedPost) {
      throw new Error('Erreur lors de la récupération du message mis à jour');
    }

    return updatedPost;
  }
}

export const updatePostUseCase = new UpdatePostUseCase();
