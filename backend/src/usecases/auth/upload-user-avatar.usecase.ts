import crypto from 'node:crypto';
import path from 'node:path';
import { IUserRepository, userRepository } from '../../repositories/user.repository.js';
import { IFileStorage, diskFileStorage } from '../../storage/file-storage.js';
import { UserNotFoundError, ValidationError } from '../../errors/domain.errors.js';

export interface UploadUserAvatarInput {
  userId: number;
  filename: string;
  mimetype: string;
  content: Buffer;
}

export interface UploadUserAvatarOutput {
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

export class UploadUserAvatarUseCase {
  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly fileStorage: IFileStorage = diskFileStorage
  ) {}

  async execute(input: UploadUserAvatarInput): Promise<UploadUserAvatarOutput> {
    if (!input.userId || input.userId <= 0) {
      throw new ValidationError('Identifiant utilisateur invalide');
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(`Utilisateur avec l'ID ${input.userId} introuvable`);
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
    const fileUrl = await this.fileStorage.saveUserFile(input.userId, randomName, input.content);

    return {
      url: fileUrl,
      filename: randomName,
    };
  }
}

export const uploadUserAvatarUseCase = new UploadUserAvatarUseCase();
