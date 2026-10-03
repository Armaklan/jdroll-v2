import { ICarteRepository, carteRepository } from '../../repositories/carte.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignPermissionService, campaignPermissionService } from '../../services/campaign-permission.service.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';

export interface DeleteCarteInput {
  carteId: number;
  userId: number;
}

export class DeleteCarteUseCase {
  constructor(
    private readonly carteRepo: ICarteRepository = carteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly campaignPermissions: CampaignPermissionService = campaignPermissionService
  ) {}

  async execute(input: DeleteCarteInput): Promise<void> {
    const carte = await this.carteRepo.findById(input.carteId);
    if (!carte) {
      throw new CarteNotFoundError(`La carte avec l'identifiant ${input.carteId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(carte.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${carte.campagneId} n'existe pas`);
    }

    if (!(await this.campaignPermissions.hasMjRights(carte.campagneId, campaign.mjId, input.userId))) {
      throw new ForbiddenError('Seul le MJ peut supprimer une carte');
    }

    await this.carteRepo.deleteCarte(input.carteId);
  }
}

export const deleteCarteUseCase = new DeleteCarteUseCase();
