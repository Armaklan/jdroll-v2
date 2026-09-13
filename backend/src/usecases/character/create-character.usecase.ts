import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface CreateCharacterInput {
  campagneId: number;
  userId: number; // Current logged-in user (must be MJ)
  name: string;
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

export interface CreateCharacterOutput {
  id: number;
  campagneId: number;
  userId: number | null;
  name: string;
  concept: string;
  avatar: string;
  publicDescription: string;
  privateDescription: string;
  technical: string;
  statut: number;
  catId: number | null;
  persoFields?: string | null;
  widgets: string;
}

export class CreateCharacterUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(input: CreateCharacterInput): Promise<CreateCharacterOutput> {
    const trimmedName = input.name ? input.name.trim() : '';
    if (!trimmedName) {
      throw new ValidationError('Le nom du personnage ne peut pas être vide');
    }

    if (trimmedName.length > 100) {
      throw new ValidationError('Le nom du personnage ne peut pas dépasser 100 caractères');
    }

    const concept = input.concept ? input.concept.trim() : '';
    if (concept.length > 200) {
      throw new ValidationError('Le concept ne peut pas dépasser 200 caractères');
    }

    const avatar = input.avatar ? input.avatar.trim() : '';
    if (avatar.length > 500) {
      throw new ValidationError("L'URL de l'avatar ne peut pas dépasser 500 caractères");
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut créer un personnage');
    }

    let catId: number | null = input.catId ?? null;
    if (catId !== null) {
      const categories = await this.campaignRepo.findCampaignPnjCategories(input.campagneId);
      const categoryExists = categories.some((c) => c.id === catId);
      if (!categoryExists) {
        throw new ValidationError('La catégorie spécifiée n\'existe pas dans cette campagne');
      }
    }

    const assignedUserId = input.assignedUserId !== undefined && input.assignedUserId !== null && input.assignedUserId > 0
      ? input.assignedUserId
      : null;

    const publicDescription = input.publicDescription ?? '';
    const privateDescription = input.privateDescription ?? '';
    const technical = input.technical ?? '';
    const statut = input.statut ?? 0;
    const persoFields = input.persoFields ?? null;
    const widgets = input.widgets ?? '';

    const characterId = await this.campaignRepo.createCharacter({
      campagneId: input.campagneId,
      userId: assignedUserId,
      name: trimmedName,
      concept,
      avatar,
      publicDescription,
      privateDescription,
      technical,
      statut,
      catId,
      persoFields,
      widgets,
    });

    return {
      id: characterId,
      campagneId: input.campagneId,
      userId: assignedUserId,
      name: trimmedName,
      concept,
      avatar,
      publicDescription,
      privateDescription,
      technical,
      statut,
      catId,
      persoFields,
      widgets,
    };
  }
}

export const createCharacterUseCase = new CreateCharacterUseCase();
