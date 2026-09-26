import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IThemeRepository, themeRepository } from '../../repositories/theme.repository.js';
import { CampaignSummary } from '../../types/index.js';
import { CampaignNotFoundError, ForbiddenError, ThemeNotFoundError } from '../../errors/domain.errors.js';

export interface ApplyThemeDTO {
  campaignId: number;
  userId: number;
  themeId: number;
}

export class ApplyThemeUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly themeRepo: IThemeRepository = themeRepository
  ) {}

  async execute(dto: ApplyThemeDTO): Promise<CampaignSummary> {
    const campaign = await this.campaignRepo.findById(dto.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${dto.campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === dto.userId || (await this.forumRepo.isUserCampaignMj(dto.campaignId, dto.userId));
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut modifier le thème de cette campagne');
    }

    const theme = await this.themeRepo.findById(dto.themeId);
    if (!theme) {
      throw new ThemeNotFoundError(`Le thème avec l'identifiant ${dto.themeId} n'existe pas`);
    }

    await this.campaignRepo.updateCampaign(dto.campaignId, {
      dialogueColor: theme.dialogueColor,
      penseeColor: theme.penseeColor,
      rp1Color: theme.rp1Color,
      rp2Color: theme.rp2Color,
      quoteColor: theme.quoteColor,
      sidebarColor: theme.sidebarColor,
      oddLineColor: theme.oddLineColor,
      evenLineColor: theme.evenLineColor,
      textColor: theme.textColor,
      linkColor: theme.linkColor,
      linkSidebarColor: theme.linkSidebarColor,
    });

    const updated = await this.campaignRepo.findById(dto.campaignId);
    if (!updated) {
      throw new Error('Erreur lors de la récupération de la campagne mise à jour');
    }

    return updated;
  }
}

export const applyThemeUseCase = new ApplyThemeUseCase();
