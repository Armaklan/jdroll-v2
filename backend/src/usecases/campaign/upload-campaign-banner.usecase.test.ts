import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UploadCampaignBannerUseCase } from './upload-campaign-banner.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IFileStorage } from '../../storage/file-storage.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../../types/index.js';
import {
  CampaignNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

class MockCampaignRepository implements ICampaignRepository {
  public updatedBanner: { campaignId: number; bannerUrl: string } | null = null;

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
  async createCampaign(): Promise<number> {
    return 1;
  }
  async updateCampaign(): Promise<void> {}
  async updateCampaignBanner(campagneId: number, bannerUrl: string): Promise<void> {
    this.updatedBanner = { campaignId: campagneId, bannerUrl };
    const c = this.campaigns.find((item) => item.id === campagneId);
    if (c) {
      c.banniere = bannerUrl;
      c.banniereForum = bannerUrl;
    }
  }
  async findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    return this.participants;
  }
  async isUserCampaignParticipant(campaignId: number, userId: number): Promise<boolean> {
    return this.participants.some((p) => p.id === userId);
  }
  async addCampaignParticipant(campaignId: number, userId: number): Promise<void> {}
}

class MockFileStorage implements IFileStorage {
  public savedFiles: { campaignId: number; filename: string; content: Buffer }[] = [];

  async saveCampaignFile(campaignId: number, filename: string, content: Buffer): Promise<string> {
    this.savedFiles.push({ campaignId, filename, content });
    return `/files/${campaignId}/${filename}`;
  }
}

describe('UploadCampaignBannerUseCase', () => {
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

  it('should successfully upload a campaign banner as GM, save file and update database', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    const buffer = Buffer.from('fake-banner-binary-data');
    const result = await useCase.execute({
      campagneId: 1,
      userId: 42, // GM
      filename: 'my-epic-banner.png',
      mimetype: 'image/png',
      content: buffer,
    });

    assert.match(result.url, /^\/files\/1\/[a-f0-9]{32}\.png$/);
    assert.match(result.filename, /^[a-f0-9]{32}\.png$/);
    assert.equal(storage.savedFiles.length, 1);
    assert.equal(storage.savedFiles[0].campaignId, 1);
    assert.equal(storage.savedFiles[0].filename, result.filename);
    assert.equal(storage.savedFiles[0].content, buffer);
    assert.deepEqual(repo.updatedBanner, {
      campaignId: 1,
      bannerUrl: result.url,
    });
  });

  it('should reject upload if user is a player but not the GM', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 10, // Player
          filename: 'banner.jpg',
          mimetype: 'image/jpeg',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof ForbiddenError && err.message.includes('Maître du Jeu')
    );
  });

  it('should reject upload if user is an unrelated user', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 999, // Stranger
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof ForbiddenError
    );
  });

  it('should reject non-image mimetypes/files', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 42,
          filename: 'script.sh',
          mimetype: 'text/x-shellscript',
          content: Buffer.from('echo hello'),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('image valide')
    );
  });

  it('should reject non-existing campaign', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 999,
          userId: 42,
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof CampaignNotFoundError
    );
  });

  it('should reject empty file content', async () => {
    const repo = new MockCampaignRepository([campaign1], [participantUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadCampaignBannerUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          campagneId: 1,
          userId: 42,
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from(''),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('vide')
    );
  });
});
