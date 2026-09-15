import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IDicerRepository, dicerRepository, DicerRollWithUser } from '../../repositories/dicer.repository.js';
import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';
import {
  evaluateDiceFormula,
  DiceRollEvaluation,
  RngFunction,
} from '../../utils/dice-roller.js';

export interface RollDiceTowerDTO {
  campaignId: number;
  userId: number;
  formula: string;
  description?: string;
}

export interface RollDiceTowerResult {
  roll: DicerRollWithUser;
  evaluation: DiceRollEvaluation;
}

export class RollDiceTowerUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly dicerRepo: IDicerRepository = dicerRepository,
    private readonly rng: RngFunction = Math.random,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(dto: RollDiceTowerDTO): Promise<RollDiceTowerResult> {
    const rawFormula = (dto.formula || '').trim();
    if (!rawFormula) {
      throw new ValidationError('La formule de jet de dés est requise');
    }

    const description = (dto.description || '').trim();

    const campaign = await this.campaignRepo.findById(dto.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${dto.campaignId} n'existe pas`);
    }

    // Vérification des droits d'accès à la campagne
    const isMj = await this.forumRepo.isUserCampaignMj(dto.campaignId, dto.userId);
    const isParticipant = isMj
      ? true
      : await this.forumRepo.isUserCampaignParticipant(dto.campaignId, dto.userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError("Vous n'êtes pas autorisé à lancer des dés dans cette campagne");
    }

    // Évaluation du jet de dés
    let evaluation: DiceRollEvaluation;
    try {
      evaluation = evaluateDiceFormula(rawFormula, description, this.rng);
    } catch (err: any) {
      throw new ValidationError(err.message || 'Formule de dés invalide');
    }

    // Insertion dans la table dicer (sans création de post dans un topic)
    const rollId = await this.dicerRepo.createRoll({
      userId: dto.userId,
      campagneId: dto.campaignId,
      result: evaluation.summaryText,
      description,
    });

    const roll = await this.dicerRepo.getRollWithUserById(rollId);
    if (!roll) {
      throw new Error('Erreur lors de la récupération du jet de dés créé');
    }

    await this.eventBus.publish({
      name: 'RollCreated',
      rollId,
      campagneId: dto.campaignId,
      userId: dto.userId,
      isTower: true,
      formula: rawFormula,
      result: evaluation.summaryText,
      description,
    });

    return {
      roll,
      evaluation,
    };
  }
}

export const rollDiceTowerUseCase = new RollDiceTowerUseCase();
