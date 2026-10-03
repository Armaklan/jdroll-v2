import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { FeatureFlipService, featureFlipService } from '../usecases/feature/feature-flip.service.js';

/**
 * Nom du feature flip conditionnant le rôle de MJ Assistant.
 */
export const ASSISTANT_MJ_FEATURE = 'assistant-mj';

/**
 * Service central de permissions de campagne.
 *
 * Deux niveaux de droits :
 *  - propriétaire (MJ) : accès complet, y compris l'administration de la campagne ;
 *  - MJ assistant : tous les droits du MJ sauf l'administration de la campagne
 *    (rôle actif uniquement lorsque le feature flip `assistant-mj` est activé).
 */
export class CampaignPermissionService {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly featureFlip: FeatureFlipService = featureFlipService
  ) {}

  /**
   * L'utilisateur est-il le MJ propriétaire de la campagne ?
   */
  isOwner(mjId: number, userId: number): boolean {
    return mjId === userId;
  }

  /**
   * L'utilisateur est-il MJ assistant de la campagne (feature flip activé uniquement) ?
   */
  async isAssistantMj(campaignId: number, userId: number): Promise<boolean> {
    if (!(await this.featureFlip.isEnabled(ASSISTANT_MJ_FEATURE))) {
      return false;
    }
    const isAssistant = this.campaignRepo.isUserCampaignAssistant
      ? await this.campaignRepo.isUserCampaignAssistant(campaignId, userId)
      : false;
    return Boolean(isAssistant);
  }

  /**
   * L'utilisateur dispose-t-il des droits MJ sur la campagne
   * (propriétaire ou MJ assistant lorsque le feature flip est activé) ?
   * Ces droits couvrent le jeu (personnages, forum, cartes, notes, dés...)
   * mais pas l'administration de la campagne, réservée au propriétaire.
   */
  async hasMjRights(campaignId: number, mjId: number, userId: number): Promise<boolean> {
    if (this.isOwner(mjId, userId)) {
      return true;
    }
    return this.isAssistantMj(campaignId, userId);
  }
}

export const campaignPermissionService = new CampaignPermissionService();
