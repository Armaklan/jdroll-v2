import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IEventBus, domainEventBus } from '../../events/event-bus.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UpdateCharacterInput {
  characterId: number;
  userId: number; // Current logged-in user
  name?: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
  privateDescription?: string;
  technical?: string;
  catId?: number | null;
  assignedUserId?: number | null;
  statut?: number;
  persoFields?: string | null;
  widgets?: string;
}

export interface UpdateCharacterOutput {
  id: number;
  campagneId: number;
  userId: number | null;
  name: string;
  concept: string;
  avatar: string;
  publicDescription: string;
  privateDescription?: string;
  technical?: string;
  statut: number;
  catId: number | null;
  persoFields?: string | null;
  widgets: string;
}

export class UpdateCharacterUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly eventBus: IEventBus = domainEventBus
  ) {}

  async execute(input: UpdateCharacterInput): Promise<UpdateCharacterOutput> {
    const existingCharacter = await this.campaignRepo.findCharacterById(input.characterId);
    if (!existingCharacter) {
      throw new CharacterNotFoundError(`Le personnage avec l'identifiant ${input.characterId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(existingCharacter.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne associée n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    const isOwner = existingCharacter.userId !== null && existingCharacter.userId === input.userId;

    if (!isMj && !isOwner) {
      throw new ForbiddenError("Vous n'avez pas l'autorisation de modifier ce personnage");
    }

    const updatePayload: Record<string, any> = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new ValidationError('Le nom du personnage ne peut pas être vide');
      }
      if (trimmedName.length > 100) {
        throw new ValidationError('Le nom du personnage ne peut pas dépasser 100 caractères');
      }
      updatePayload.name = trimmedName;
    }

    if (input.concept !== undefined) {
      const trimmedConcept = input.concept.trim();
      if (trimmedConcept.length > 200) {
        throw new ValidationError('Le concept ne peut pas dépasser 200 caractères');
      }
      updatePayload.concept = trimmedConcept;
    }

    if (input.avatar !== undefined) {
      const trimmedAvatar = input.avatar.trim();
      if (trimmedAvatar.length > 500) {
        throw new ValidationError("L'URL de l'avatar ne peut pas dépasser 500 caractères");
      }
      updatePayload.avatar = trimmedAvatar;
    }

    if (input.publicDescription !== undefined) {
      updatePayload.publicDescription = input.publicDescription;
    }

    if (input.privateDescription !== undefined) {
      updatePayload.privateDescription = input.privateDescription;
    }

    if (input.technical !== undefined) {
      updatePayload.technical = input.technical;
    }

    if (input.persoFields !== undefined) {
      updatePayload.persoFields = input.persoFields;
    }

    if (input.widgets !== undefined) {
      updatePayload.widgets = input.widgets;
    }

    // Only MJ can reassign user, category or status
    if (isMj) {
      if (input.catId !== undefined) {
        if (input.catId !== null) {
          const categories = await this.campaignRepo.findCampaignPnjCategories(existingCharacter.campagneId);
          const categoryExists = categories.some((c) => c.id === input.catId);
          if (!categoryExists) {
            throw new ValidationError("La catégorie spécifiée n'existe pas dans cette campagne");
          }
        }
        updatePayload.catId = input.catId;
      }

      if (input.assignedUserId !== undefined) {
        updatePayload.userId =
          input.assignedUserId !== null && input.assignedUserId > 0 ? input.assignedUserId : null;
      }

      if (input.statut !== undefined) {
        updatePayload.statut = input.statut;
      }
    }

    await this.campaignRepo.updateCharacter(input.characterId, updatePayload);

    const updatedCharacter = await this.campaignRepo.findCharacterById(input.characterId);
    const char = updatedCharacter || existingCharacter;

    await this.eventBus.publish({
      name: 'CharacterUpdated',
      characterId: input.characterId,
      campagneId: existingCharacter.campagneId,
      characterName: updatePayload.name ?? char.name,
      characterOwnerId: char.userId,
      modifierUserId: input.userId,
    });

    return {
      id: char.id,
      campagneId: char.campagneId,
      userId: char.userId,
      name: updatePayload.name ?? char.name,
      concept: updatePayload.concept ?? char.concept ?? '',
      avatar: updatePayload.avatar ?? char.avatar ?? '',
      publicDescription: updatePayload.publicDescription ?? char.publicDescription ?? '',
      privateDescription: isMj || isOwner ? (updatePayload.privateDescription ?? char.privateDescription ?? '') : undefined,
      technical: isMj || isOwner ? (updatePayload.technical ?? char.technical ?? '') : undefined,
      statut: updatePayload.statut ?? char.statut,
      catId: updatePayload.catId !== undefined ? updatePayload.catId : char.catId,
      persoFields: updatePayload.persoFields !== undefined ? updatePayload.persoFields : char.persoFields,
      widgets: updatePayload.widgets ?? char.widgets ?? '',
    };
  }
}

export const updateCharacterUseCase = new UpdateCharacterUseCase();
