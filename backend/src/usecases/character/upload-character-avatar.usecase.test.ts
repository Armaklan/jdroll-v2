import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UploadCharacterAvatarUseCase } from './upload-character-avatar.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IFileStorage } from '../../storage/file-storage.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../../types/index.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

class MockCampaignRepository implements ICampaignRepository {
  constructor(
    private campaigns: CampaignSummary[] = [],
    private participants: CampaignParticipant[] = []
  ) {}

  async findMasteredCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findPlayerCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findAllCampaigns(): Promise<CampaignSummary[]> {
    return this.campaigns;
  }
  async findById(id: number): Promise<CampaignSummary | null> {
    return this.campaigns.find((c) => c.id === id) || null;
  }
  async findCampaignCharacters(): Promise<RawCampaignCharacterRow[]> {
    return [];
  }
  async findCampaignPnjCategories(): Promise<RawPnjCategoryRow[]> {
    return [];
  }
  async findCharacterById(): Promise<RawCampaignCharacterRow | null> {
    return null;
  }
  async createCharacter(): Promise<number> {
    return 1;
  }
  async updateCharacter(): Promise<void> {}
  async findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    return this.participants;
  }
}

class MockFileStorage implements IFileStorage {
  public savedFiles: { campaignId: number; filename: string; content: Buffer }[] = [];

  async saveCampaignFile(campaignId: number, filename: string, content: Buffer): Promise<string> {
    this.savedFiles.push({ campaignId, filename, content });
    return `/files/${campaignId}/${filename}`;
  }
}

describe('UploadCharacterAvatarUseCase', () => {
  const campaign1: CampaignSummary = {
    id: 1,
    name: 'Campagne de test',
    mjId: 42,
    mjUsername: 'mj_user',
    mjAvatar: '',
    nbJoueurs: 4,
    nbJoueursActuel: 1,
    banniere: '',
    systeme: 'D&D',
    univers: 'Médiéval',
    description: '',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const participantUser: CampaignParticipant = {
    id: 10,
    username: 'player1',
    avatar: '',
  };

  it('should successfully upload an avatar as GM and generate random filename in campaign subfolder', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCharacterAvatarUseCase(repo, storage);

    const buffer = Buffer.from('fake-image-binary-data');
    const result = await useCase.execute({
      campagneId: 1,
      userId: 42, // GM
      filename: 'my-character-drawing.png',
      mimetype: 'image/png',
      content: buffer,
    });

    assert.match(result.url, /^\/files\/1\/[a-f0-9]{32}\.png$/);
    assert.match(result.filename, /^[a-f0-9]{32}\.png$/);
    assert.equal(storage.savedFiles.length, 1);
    assert.equal(storage.savedFiles[0].campaignId, 1);
    assert.equal(storage.savedFiles[0].filename, result.filename);
    assert.equal(storage.savedFiles[0].content, buffer);
  });

  it('should successfully upload an avatar as Campaign Player', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCharacterAvatarUseCase(repo, storage);

    const buffer = Buffer.from('fake-jpeg-data');
    const result = await useCase.execute({
      campagneId: 1,
      userId: 10, // Player
      filename: 'avatar.jpg',
      mimetype: 'image/jpeg',
      content: buffer,
    });

    assert.match(result.url, /^\/files\/1\/[a-f0-9]{32}\.jpg$/);
    assert.equal(storage.savedFiles.length, 1);
  });

  it('should reject upload if user is not GM and not participant', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCharacterAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 999, // Stranger
          filename: 'avatar.png',
          mimetype: 'image/png',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('should reject non-image mimetypes/files', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCharacterAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 42,
          filename: 'malicious.exe',
          mimetype: 'application/octet-stream',
          content: Buffer.from('binary-exe'),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('image valide')
    );
  });

  it('should reject non-existing campaign', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCharacterAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 999,
          userId: 42,
          filename: 'avatar.png',
          mimetype: 'image/png',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof CampaignNotFoundError
    );
  });
});
