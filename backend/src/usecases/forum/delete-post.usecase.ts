import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import {
  PostNotFoundError,
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
} from '../../errors/domain.errors.js';

export interface DeletePostDTO {
  postId: number;
  userId: number;
}

export interface DeletePostResult {
  success: boolean;
  topicId: number;
  deletedPostId: number;
  newLastPostId: number | null;
}

export class DeletePostUseCase {
  constructor(private readonly forumRepo: IForumRepository = forumRepository) {}

  async execute(dto: DeletePostDTO): Promise<DeletePostResult> {
    const post = await this.forumRepo.getPostById(dto.postId, dto.userId);
    if (!post) {
      throw new PostNotFoundError(`Le message avec l'identifiant ${dto.postId} n'existe pas`);
    }

    const topic = await this.forumRepo.findTopicById(post.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${post.topicId} n'existe pas`);
    }

    if (topic.campagneId && topic.campagneId > 0) {
      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, dto.userId);

      if (!isMj) {
        if (post.user.id !== dto.userId) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à supprimer ce message");
        }

        if (Boolean(topic.isClosed)) {
          throw new TopicClosedError('Ce sujet est fermé');
        }

        const newerPostsCount = await this.forumRepo.countPostsAfterPostId(topic.id, post.id);
        if (newerPostsCount > 0) {
          throw new ForbiddenError("Vous ne pouvez supprimer votre message que s'il s'agit du dernier message du sujet");
        }
      }
    } else {
      // Forum Général
      if (post.user.id !== dto.userId) {
        throw new ForbiddenError("Vous n'êtes pas autorisé à supprimer ce message");
      }

      if (Boolean(topic.isClosed)) {
        throw new TopicClosedError('Ce sujet est fermé');
      }

      const newerPostsCount = await this.forumRepo.countPostsAfterPostId(topic.id, post.id);
      if (newerPostsCount > 0) {
        throw new ForbiddenError("Vous ne pouvez supprimer votre message que s'il s'agit du dernier message du sujet");
      }
    }

    const remainingLastPost = await this.forumRepo.findLastPost(topic.id, post.id);
    const newLastPostId = remainingLastPost ? remainingLastPost.id : null;

    if (topic.lastPostId === post.id) {
      await this.forumRepo.updateTopicLastPost(topic.id, newLastPostId);
    }

    await this.forumRepo.deletePost(post.id);

    return {
      success: true,
      topicId: topic.id,
      deletedPostId: post.id,
      newLastPostId,
    };
  }
}

export const deletePostUseCase = new DeletePostUseCase();
