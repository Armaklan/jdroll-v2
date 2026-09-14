import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignSummary } from '../../types/index.js';
import { ValidationError } from '../../errors/domain.errors.js';

export interface CreateCampaignDTO {
  mjId: number;
  name: string;
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
}

export class CreateCampaignUseCase {
  constructor(private readonly campaignRepo: ICampaignRepository = campaignRepository) {}

  async execute(dto: CreateCampaignDTO): Promise<CampaignSummary> {
    const name = (dto.name || '').trim();
    if (!name) {
      throw new ValidationError('Le nom de la campagne est requis');
    }
    if (name.length > 100) {
      throw new ValidationError('Le nom de la campagne ne peut pas dépasser 100 caractères');
    }

    const systeme = (dto.systeme || '').trim();
    if (systeme.length > 100) {
      throw new ValidationError('Le système de jeu ne peut pas dépasser 100 caractères');
    }

    const univers = (dto.univers || '').trim();
    if (univers.length > 100) {
      throw new ValidationError("L'univers de jeu ne peut pas dépasser 100 caractères");
    }

    const description = (dto.description || '').trim();

    const nbJoueurs = dto.nbJoueurs !== undefined ? Number(dto.nbJoueurs) : 4;
    if (isNaN(nbJoueurs) || nbJoueurs < 1 || nbJoueurs > 50) {
      throw new ValidationError('Le nombre de joueurs doit être compris entre 1 et 50');
    }

    const campaignId = await this.campaignRepo.createCampaign({
      mjId: dto.mjId,
      name,
      systeme,
      univers,
      description,
      nbJoueurs,
      banniere: dto.banniere?.trim() || '',
      banniereForum: dto.banniereForum !== undefined ? (dto.banniereForum?.trim() || null) : undefined,
      statut: dto.statut ?? 0,
      isRecrutementOpen: dto.isRecrutementOpen !== false,
      rythme: dto.rythme ?? 2,
      rp: dto.rp ?? 1,
      isMultiCharacter: Boolean(dto.isMultiCharacter),
      dialogueColor: dto.dialogueColor || null,
      penseeColor: dto.penseeColor || null,
      rp1Color: dto.rp1Color || null,
      rp2Color: dto.rp2Color || null,
      quoteColor: dto.quoteColor || null,
      sidebarColor: dto.sidebarColor || null,
      oddLineColor: dto.oddLineColor || null,
      evenLineColor: dto.evenLineColor || null,
      textColor: dto.textColor || null,
      linkColor: dto.linkColor || null,
      linkSidebarColor: dto.linkSidebarColor || null,
      hr: dto.hr || null,
      width: dto.width || null,
      defaultDice: dto.defaultDice || null,
    });

    const createdCampaign = await this.campaignRepo.findById(campaignId);
    if (!createdCampaign) {
      throw new Error('Erreur lors de la récupération de la campagne créée');
    }

    return createdCampaign;
  }
}

export const createCampaignUseCase = new CreateCampaignUseCase();
