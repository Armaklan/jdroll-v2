import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import { CampaignForumData } from '../types/index.js';
import { CampaignNotFoundError } from '../errors/domain.errors.js';

export class ForumQueries {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  /**
   * Récupère les données complètes du forum d'une campagne (détails de la campagne, sections et topics avec statut de lecture)
   */
  async getCampaignForum(campaignId: number, userId?: number): Promise<CampaignForumData> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    const sections = await this.forumRepo.findSectionsByCampaignId(campaignId, userId);

    return {
      campaign,
      sections,
    };
  }
}

export const forumQueries = new ForumQueries();
