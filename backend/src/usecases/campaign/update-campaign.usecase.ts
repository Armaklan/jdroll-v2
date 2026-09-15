import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { CampaignSummary } from '../../types/index.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';

export interface UpdateCampaignDTO {
  campaignId: number;
  userId: number;
  name?: string;
  systeme?: string;
  univers?: string;
  description?: string;
  nbJoueurs?: number;
  banniere?: string;
  banniereForum?: string | null;
  statut?: number;
  isRecrutementOpen?: boolean;
  rythme?: number;
  rp?: number;
  isMultiCharacter?: boolean;
  dialogueColor?: string | null;
  penseeColor?: string | null;
  rp1Color?: string | null;
  rp2Color?: string | null;
  quoteColor?: string | null;
  sidebarColor?: string | null;
  oddLineColor?: string | null;
  evenLineColor?: string | null;
  textColor?: string | null;
  linkColor?: string | null;
  linkSidebarColor?: string | null;
  hr?: string | null;
  width?: string | null;
  defaultDice?: string | null;
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}

export class UpdateCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(dto: UpdateCampaignDTO): Promise<CampaignSummary> {
    const campaign = await this.campaignRepo.findById(dto.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${dto.campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === dto.userId || (await this.forumRepo.isUserCampaignMj(dto.campaignId, dto.userId));
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut modifier cette campagne');
    }

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new ValidationError('Le nom de la campagne ne peut pas être vide');
      }
      if (trimmed.length > 100) {
        throw new ValidationError('Le nom de la campagne ne peut pas dépasser 100 caractères');
      }
    }

    if (dto.systeme !== undefined) {
      const trimmed = dto.systeme.trim();
      if (trimmed.length > 100) {
        throw new ValidationError('Le système de jeu ne peut pas dépasser 100 caractères');
      }
    }

    if (dto.univers !== undefined) {
      const trimmed = dto.univers.trim();
      if (trimmed.length > 100) {
        throw new ValidationError("L'univers de jeu ne peut pas dépasser 100 caractères");
      }
    }

    if (dto.nbJoueurs !== undefined) {
      const num = Number(dto.nbJoueurs);
      if (isNaN(num) || num < 1 || num > 50) {
        throw new ValidationError('Le nombre de joueurs doit être compris entre 1 et 50');
      }
    }

    await this.campaignRepo.updateCampaign(dto.campaignId, {
      name: dto.name !== undefined ? dto.name.trim() : undefined,
      systeme: dto.systeme !== undefined ? dto.systeme.trim() : undefined,
      univers: dto.univers !== undefined ? dto.univers.trim() : undefined,
      description: dto.description !== undefined ? dto.description.trim() : undefined,
      nbJoueurs: dto.nbJoueurs !== undefined ? Number(dto.nbJoueurs) : undefined,
      banniere: dto.banniere !== undefined ? dto.banniere.trim() : undefined,
      banniereForum: dto.banniereForum !== undefined ? (dto.banniereForum ? dto.banniereForum.trim() : null) : undefined,
      statut: dto.statut !== undefined ? Number(dto.statut) : undefined,
      isRecrutementOpen: dto.isRecrutementOpen,
      rythme: dto.rythme !== undefined ? Number(dto.rythme) : undefined,
      rp: dto.rp !== undefined ? Number(dto.rp) : undefined,
      isMultiCharacter: dto.isMultiCharacter !== undefined ? Boolean(dto.isMultiCharacter) : undefined,
      dialogueColor: dto.dialogueColor,
      penseeColor: dto.penseeColor,
      rp1Color: dto.rp1Color,
      rp2Color: dto.rp2Color,
      quoteColor: dto.quoteColor,
      sidebarColor: dto.sidebarColor,
      oddLineColor: dto.oddLineColor,
      evenLineColor: dto.evenLineColor,
      textColor: dto.textColor,
      linkColor: dto.linkColor,
      linkSidebarColor: dto.linkSidebarColor,
      hr: dto.hr,
      width: dto.width,
      defaultDice: dto.defaultDice,
      template: dto.template,
      templateHtml: dto.templateHtml,
      templateImg: dto.templateImg,
      templateFields: dto.templateFields,
    });

    const updated = await this.campaignRepo.findById(dto.campaignId);
    if (!updated) {
      throw new Error('Erreur lors de la récupération de la campagne mise à jour');
    }

    return updated;
  }
}

export const updateCampaignUseCase = new UpdateCampaignUseCase();
