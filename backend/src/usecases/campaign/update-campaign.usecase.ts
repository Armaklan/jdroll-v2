import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { CampaignSummary } from '../../types/index.js';
import { CampaignNotFoundError, ForbiddenError, ValidationError } from '../../errors/domain.errors.js';
import { FeatureFlipService, featureFlipService } from '../feature/feature-flip.service.js';
import {
  SHEET_MODES,
  SheetMode,
  validateSheetDefinition,
} from '../../schemas/sheet-definition.schema.js';

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
  defaultPersoId?: number | null;
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
  widgets?: string | null;
  sidebarText?: string | null;
  sheetMode?: string | null;
  sheetDefinition?: string | null;
}

export class UpdateCampaignUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly featureFlip: FeatureFlipService = featureFlipService
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

    const templateImg = dto.templateImg !== undefined ? (dto.templateImg ? dto.templateImg.trim() : '') : undefined;
    let templateHtml = dto.templateHtml !== undefined ? (dto.templateHtml ? dto.templateHtml.trim() : '') : undefined;
    if (templateImg && (templateHtml === undefined || templateHtml === '')) {
      templateHtml = `<img id="zoneImg" src="${templateImg}" style="width: 800px">`;
    }

    let sheetMode: SheetMode | undefined = undefined;
    if (dto.sheetMode !== undefined) {
      if (dto.sheetMode === null || !(SHEET_MODES as readonly string[]).includes(dto.sheetMode)) {
        throw new ValidationError(`Mode de feuille de personnage invalide : ${dto.sheetMode}`);
      }
      sheetMode = dto.sheetMode as SheetMode;
      if (sheetMode === 'programmed') {
        const isEnabled = await this.featureFlip.isEnabled('programmed-sheet');
        if (!isEnabled) {
          throw new ForbiddenError("Le module de fiche de personnage programmée n'est pas activé");
        }
      }
    }

    let sheetDefinition: string | null | undefined = undefined;
    if (dto.sheetDefinition !== undefined) {
      if (dto.sheetDefinition === null || dto.sheetDefinition === '') {
        sheetDefinition = null;
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(dto.sheetDefinition);
        } catch {
          throw new ValidationError('La définition de fiche programmée doit être un JSON valide');
        }
        const validated = validateSheetDefinition(parsed);
        if (!validated.success) {
          throw new ValidationError(
            `Définition de fiche programmée invalide : ${validated.error.issues
              .map((issue) => `${issue.path.join('.') || 'fiche'} ${issue.message}`)
              .join('; ')}`
          );
        }
        sheetDefinition = JSON.stringify(validated.data);
      }
    }

    await this.campaignRepo.updateCampaign(dto.campaignId, {
      name: dto.name !== undefined ? dto.name.trim() : undefined,
      systeme: dto.systeme !== undefined ? dto.systeme.trim() : undefined,
      univers: dto.univers !== undefined ? dto.univers.trim() : undefined,
      description: dto.description !== undefined ? dto.description.trim() : undefined,
      nbJoueurs: dto.nbJoueurs !== undefined ? Number(dto.nbJoueurs) : undefined,
      banniere: dto.banniere !== undefined ? (dto.banniere ? dto.banniere.trim() : '') : undefined,
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
      linkSidebarColor: dto.linkSidebarColor !== undefined ? (dto.linkSidebarColor ? dto.linkSidebarColor.trim() : '') : undefined,
      hr: dto.hr,
      width: dto.width,
      defaultDice: dto.defaultDice,
      defaultPersoId: dto.defaultPersoId,
      template: dto.template !== undefined ? (dto.template ? dto.template.trim() : '') : undefined,
      templateHtml,
      templateImg,
      templateFields: dto.templateFields,
      widgets: dto.widgets,
      sidebarText: dto.sidebarText,
      sheetMode,
      sheetDefinition,
    });

    const updated = await this.campaignRepo.findById(dto.campaignId);
    if (!updated) {
      throw new Error('Erreur lors de la récupération de la campagne mise à jour');
    }

    return updated;
  }
}

export const updateCampaignUseCase = new UpdateCampaignUseCase();
