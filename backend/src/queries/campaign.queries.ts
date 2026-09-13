import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { CampaignSummary, CampaignRole } from '../types/index.js';

export class CampaignQueries {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  /**
   * Récupère les campagnes maîtrisées par un utilisateur (MJ)
   */
  async getMyMasteredCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findMasteredCampaigns(userId, includeArchived);
  }

  /**
   * Récupère les campagnes où l'utilisateur participe en tant que joueur
   */
  async getMyPlayerCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    return this.campaignRepo.findPlayerCampaigns(userId, includeArchived);
  }

  /**
   * Récupère la liste des campagnes selon le rôle (master ou player) et le filtre d'archivage
   */
  async getMyCampaigns(userId: number, role: CampaignRole, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    if (role === 'master') {
      return this.getMyMasteredCampaigns(userId, includeArchived);
    }
    return this.getMyPlayerCampaigns(userId, includeArchived);
  }

  /**
   * Récupère la liste de toutes les campagnes (avec filtre d'archivage et recherche par nom/système/univers)
   */
  async getAllCampaigns(includeArchived: boolean = false, search?: string): Promise<CampaignSummary[]> {
    return this.campaignRepo.findAllCampaigns({ includeArchived, search });
  }
}

export const campaignQueries = new CampaignQueries();
