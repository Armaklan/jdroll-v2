import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IDicerRepository, dicerRepository } from '../../repositories/dicer.repository.js';
import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import { ForumPost } from '../../types/index.js';
import {
  TopicNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import {
  evaluateDiceFormula,
  generateDicePostContent,
  DiceRollEvaluation,
  RngFunction,
} from '../../utils/dice-roller.js';

export interface RollDiceDTO {
  topicId: number;
  userId: number;
  formula: string;
  description?: string;
}

export interface RollDiceResult {
  post: ForumPost;
  rollId: number;
  evaluation: DiceRollEvaluation;
}

export class RollDiceUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly dicerRepo: IDicerRepository = dicerRepository,
    private readonly rng: RngFunction = Math.random,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(dto: RollDiceDTO): Promise<RollDiceResult> {
    const rawFormula = (dto.formula || '').trim();
    if (!rawFormula) {
      throw new ValidationError('La formule de jet de dés est requise');
    }

    const description = (dto.description || '').trim();

    const topic = await this.forumRepo.findTopicById(dto.topicId);
    if (!topic) {
      throw new TopicNotFoundError(`Le sujet avec l'identifiant ${dto.topicId} n'existe pas`);
    }

    if (Boolean(topic.isClosed)) {
      throw new TopicClosedError('Ce sujet est fermé aux réponses');
    }

    // Vérification des droits d'accès au topic
    let isPrivateVal = 0;
    const rawIsPrivate = Number(topic.isPrivate || 0);
    if (rawIsPrivate === 1) {
      isPrivateVal = 1;
    } else if (rawIsPrivate === 2) {
      isPrivateVal = 2;
    }

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
          throw new ForbiddenError("Vous n'êtes pas autorisé à lancer des dés dans ce sujet privé");
        }
      } else if (isPrivateVal === 0) {
        if (!isMj && !isParticipant) {
          throw new ForbiddenError("Seuls les joueurs et le MJ peuvent lancer des dés dans ce sujet public");
        }
      }
      // isPrivateVal === 2 (Grand public) : tout le monde peut poster / lancer les dés
    } else {
      // Forum Général
      if (isPrivateVal === 1) {
        const isCanRead = await this.forumRepo.isUserTopicCanRead(topic.id, dto.userId);
        if (!isCanRead) {
          throw new ForbiddenError("Vous n'êtes pas autorisé à lancer des dés dans ce sujet privé");
        }
      }
    }

    // Évaluation du jet de dés
    let evaluation: DiceRollEvaluation;
    try {
      evaluation = evaluateDiceFormula(rawFormula, description, this.rng);
    } catch (err: any) {
      throw new ValidationError(err.message || 'Formule de dés invalide');
    }

    // 1. Insertion dans la table dicer
    const rollId = await this.dicerRepo.createRoll({
      userId: dto.userId,
      campagneId: topic.campagneId ?? 0,
      result: evaluation.summaryText,
      description,
    });

    // 2. Génération du contenu HTML du post
    const postContent = generateDicePostContent(evaluation, description);

    // 3. Création du post dans le topic courant (sans user_id / auteur)
    const postId = await this.forumRepo.createPost({
      topicId: dto.topicId,
      userId: null,
      persoId: null,
      content: postContent,
      editor: 0,
    });

    await this.forumRepo.updateTopicLastPost(dto.topicId, postId);
    await this.forumRepo.markTopicAsRead(dto.topicId, dto.userId, postId);

    const post = await this.forumRepo.getPostById(postId, dto.userId);
    if (!post) {
      throw new Error('Erreur lors de la récupération du message de dé créé');
    }

    await this.eventBus.publish({
      name: 'RollCreated',
      rollId,
      campagneId: topic.campagneId ?? 0,
      userId: dto.userId,
      topicId: dto.topicId,
      topicTitle: topic.title,
      isPrivate: isPrivateVal,
      isTower: false,
      formula: rawFormula,
      result: evaluation.summaryText,
      description,
    });

    return {
      post,
      rollId,
      evaluation,
    };
  }
}

export const rollDiceUseCase = new RollDiceUseCase();
