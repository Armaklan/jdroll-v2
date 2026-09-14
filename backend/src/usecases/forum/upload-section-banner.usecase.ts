import crypto from 'node:crypto';
import path from 'node:path';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { IFileStorage, diskFileStorage } from '../../storage/file-storage.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

export interface UploadSectionBannerInput {
  sectionId: number;
  campagneId?: number;
  userId: number;
  filename: string;
  mimetype: string;
  content: Buffer;
}

export interface UploadSectionBannerOutput {
  url: string;
  filename: string;
  sectionId: number;
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

export class UploadSectionBannerUseCase {
  constructor(
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly fileStorage: IFileStorage = diskFileStorage
  ) {}

  async execute(input: UploadSectionBannerInput): Promise<UploadSectionBannerOutput> {
    if (!input.sectionId || input.sectionId <= 0) {
      throw new ValidationError('Identifiant de section invalide');
    }

    const section = await this.forumRepo.findSectionById(input.sectionId);
    if (!section) {
      throw new SectionNotFoundError(`La section avec l'identifiant ${input.sectionId} n'existe pas`);
    }

    const campagneId = section.campagneId ?? input.campagneId;
    if (!campagneId) {
      throw new ForbiddenError('Seules les sections de campagne peuvent recevoir une bannière téléversée');
    }

    const isMj = await this.forumRepo.isUserCampaignMj(campagneId, input.userId);
    if (!isMj) {
      throw new ForbiddenError('Seul le Maître du Jeu peut modifier la bannière de la section');
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
      throw new ValidationError("L'image ne doit pas dépasser 10 Mo");
    }

    const randomName = `${crypto.randomBytes(16).toString('hex')}${extension}`;
    const fileUrl = await this.fileStorage.saveCampaignFile(campagneId, randomName, input.content);

    await this.forumRepo.updateSection(input.sectionId, {
      banniere: fileUrl,
    });

    return {
      url: fileUrl,
      filename: randomName,
      sectionId: input.sectionId,
    };
  }
}

export const uploadSectionBannerUseCase = new UploadSectionBannerUseCase();
