import path from 'node:path';
import fs from 'node:fs';

export function getFilesDirectory(): string {
  if (process.env.FILES_DIR) {
    return path.resolve(process.env.FILES_DIR);
  }
  if (path.basename(process.cwd()) === 'backend') {
    return path.resolve(process.cwd(), '..', 'files');
  }
  return path.resolve(process.cwd(), 'files');
}

export interface IFileStorage {
  saveCampaignFile(campaignId: number, filename: string, content: Buffer): Promise<string>;
  saveUserFile(userId: number, filename: string, content: Buffer): Promise<string>;
}

export class DiskFileStorage implements IFileStorage {
  constructor(private readonly baseDir: string = getFilesDirectory()) {}

  async saveCampaignFile(campaignId: number, filename: string, content: Buffer): Promise<string> {
    const campaignDir = path.join(this.baseDir, String(campaignId));
    await fs.promises.mkdir(campaignDir, { recursive: true });
    const targetPath = path.join(campaignDir, filename);
    await fs.promises.writeFile(targetPath, content);
    return `/files/${campaignId}/${filename}`;
  }

  async saveUserFile(userId: number, filename: string, content: Buffer): Promise<string> {
    const userDir = path.join(this.baseDir, 'users', String(userId));
    await fs.promises.mkdir(userDir, { recursive: true });
    const targetPath = path.join(userDir, filename);
    await fs.promises.writeFile(targetPath, content);
    return `/files/users/${userId}/${filename}`;
  }
}

export const diskFileStorage: IFileStorage = new DiskFileStorage();
