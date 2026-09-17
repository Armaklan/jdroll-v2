import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { TopicDraft } from '../../types/index.js';
import {
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface SaveDraftDTO {
  topicId: number;
  userId: number;
  content: string;
  persoId?: number | null;
}

export class SaveDraftUseCase {
  constructor(private readonly forumRepo: IForumRepository = forumRepository) {}

  async execute(dto: SaveDraftDTO): Promise<TopicDraft | null> {
    const topic = await this.forumRepo.findTopicById(dto.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${dto.topicId} n'existe pas`);
    }

    if (Boolean(topic.isClosed)) {
      throw new TopicClosedError('Ce sujet est fermé aux réponses');
    }

    let isPrivateVal = 0;
    const rawIsPrivate = Number(topic.isPrivate || 0);
    if (rawIsPrivate === 1) {
      isPrivateVal = 1;
    } else if (rawIsPrivate === 2) {
      isPrivateVal = 2;
    }

    let finalPersoId: number | null = null;

    if (topic.campagneId && topic.campagneId > 0) {
      const isMj = await this.forumRepo.isUserCampaignMj(topic.campagneId, dto.userId);
      const isParticipant = isMj
        ? true
        : await this.forumRepo.isUserCampaignParticipant(topic.campagneId, dto.userId);
      const isCanRead = isMj
        ? true
        : await this.forumRepo.isUserTopicCanRead(topic.id, dto.userId);

      if (isPrivateVal === 1) {
        if (!isMj && !isCanRead) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à poster dans ce sujet privé");
        }
      } else if (isPrivateVal === 0) {
        if (!isMj && !isParticipant) {
          throw new ForbiddenError("Seuls les joueurs et le MJ peuvent poster dans ce sujet public");
        }
      }

      if (dto.persoId) {
        const perso = await this.forumRepo.findPersoById(dto.persoId);
        if (!perso || perso.campagneId !== topic.campagneId) {
          throw new ValidationError("Ce personnage n'appartient pas à cette campagne");
        }
        if (!isMj && perso.userId !== dto.userId) {
          throw new ForbiddenError("Ce personnage ne vous est pas assigné");
        }
        finalPersoId = perso.id;
      }
    } else {
      // Forum Général
      if (isPrivateVal === 1) {
        const isCanRead = await this.forumRepo.isUserTopicCanRead(topic.id, dto.userId);
        if (!isCanRead) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à poster dans ce sujet privé");
        }
      }
      finalPersoId = null;
    }

    const rawContent = (dto.content || '').trim();
    const textOnly = rawContent.replace(/<[^>]*>/g, '').trim();

    if (!rawContent || (!textOnly && !rawContent.includes('<img') && !rawContent.includes('<hr'))) {
      await this.forumRepo.deleteDraft(dto.topicId, dto.userId);
      return null;
    }

    return this.forumRepo.saveDraft({
      topicId: dto.topicId,
      userId: dto.userId,
      persoId: finalPersoId,
      content: dto.content,
    });
  }
}

export const saveDraftUseCase = new SaveDraftUseCase();
