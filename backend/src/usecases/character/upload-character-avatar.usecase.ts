import crypto from 'node:crypto';
import path from 'node:path';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IFileStorage, diskFileStorage } from '../../storage/file-storage.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UploadCharacterAvatarInput {
  campagneId: number;
  userId: number;
  filename: string;
  mimetype: string;
  content: Buffer;
}

export interface UploadCharacterAvatarOutput {
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

export class UploadCharacterAvatarUseCase {
  constructor(
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly fileStorage: IFileStorage = diskFileStorage
  ) {}

  async execute(input: UploadCharacterAvatarInput): Promise<UploadCharacterAvatarOutput> {
    if (!input.campagneId || input.campagneId <= 0) {
      throw new ValidationError('Identifiant de campagne invalide');
    }

    const campaign = await this.campaignRepo.findById(input.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campagneId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    let isParticipant = isMj;

    if (!isParticipant) {
      const participants = await this.campaignRepo.findCampaignParticipants(input.campagneId);
      isParticipant = participants.some((p) => p.id === input.userId);
    }

    if (!isParticipant) {
      throw new ForbiddenError('Vous devez être membre ou MJ de cette campagne pour téléverser une image');
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

    return {
      url: fileUrl,
      filename: randomName,
    };
  }
}

export const uploadCharacterAvatarUseCase = new UploadCharacterAvatarUseCase();
