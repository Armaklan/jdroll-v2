import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  ForbiddenError,
} from '../../errors/domain.errors.js';

export interface DeleteCharacterInput {
  characterId: number;
  userId: number; // Current logged-in user
}

export interface DeleteCharacterOutput {
  success: boolean;
  characterId: number;
}

export class DeleteCharacterUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(input: DeleteCharacterInput): Promise<DeleteCharacterOutput> {
    const existingCharacter = await this.campaignRepo.findCharacterById(input.characterId);
    if (!existingCharacter) {
      throw new CharacterNotFoundError(`Le personnage avec l'identifiant ${input.characterId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(existingCharacter.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne associée n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut supprimer un personnage');
    }

    await this.campaignRepo.deleteCharacter(input.characterId);

    return {
      success: true,
      characterId: input.characterId,
    };
  }
}

export const deleteCharacterUseCase = new DeleteCharacterUseCase();
