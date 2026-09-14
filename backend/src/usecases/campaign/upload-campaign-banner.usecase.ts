import crypto from 'node:crypto';
import path from 'node:path';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IFileStorage, diskFileStorage } from '../../storage/file-storage.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UploadCampaignBannerInput {
  campagneId: number;
  userId: number;
  filename: string;
  mimetype: string;
  content: Buffer;
}

export interface UploadCampaignBannerOutput {
  url: string;
  filename: string;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

export class UploadCampaignBannerUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly fileStorage: IFileStorage = diskFileStorage
  ) {}

  async execute(input: UploadCampaignBannerInput): Promise<UploadCampaignBannerOutput> {
    if (!input.campagneId || input.campagneId <= 0) {
      throw new ValidationError('Identifiant de campagne invalide');
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    if (campaign.mjId !== input.userId) {
      throw new ForbiddenError('Seul le Maître du Jeu peut modifier la bannière de la campagne');
    }

    const normalizedMime = (input.mimetype || '').toLowerCase().trim();
    let extension = ALLOWED_MIME_TYPES[normalizedMime];

    if (!extension) {
      const ext = path.extname(input.filename || '').toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];
      if (validExtensions.includes(ext)) {
        extension = ext === '.jpeg' ? '.jpg' : ext;
      } else {
        throw new ValidationError('Le fichier doit être une image valide (JPEG, PNG, GIF, WebP, SVG, AVIF)');
      }
    }

    if (!input.content || input.content.length === 0) {
      throw new ValidationError('Le fichier est vide');
    }

    if (input.content.length > 10 * 1024 * 1024) {
      throw new ValidationError('L\'image ne doit pas dépasser 10 Mo');
    }

    const randomName = `${crypto.randomBytes(16).toString('hex')}${extension}`;
    const fileUrl = await this.fileStorage.saveCampaignFile(input.campagneId, randomName, input.content);

    await this.campaignRepo.updateCampaignBanner(input.campagneId, fileUrl);

    return {
      url: fileUrl,
      filename: randomName,
    };
  }
}

export const uploadCampaignBannerUseCase = new UploadCampaignBannerUseCase();
