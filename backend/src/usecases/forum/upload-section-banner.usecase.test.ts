import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UploadSectionBannerUseCase } from './upload-section-banner.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IFileStorage } from '../../storage/file-storage.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('UploadSectionBannerUseCase', () => {
  let useCase: UploadSectionBannerUseCase;
  let mockForumRepo: IForumRepository;
  let mockFileStorage: IFileStorage;
  let savedFiles: Array<{ campaignId: number; filename: string; content: Buffer }>;
  let updatedSectionData: any;

  beforeEach(() => {
    savedFiles = [];
    updatedSectionData = null;

    mockForumRepo = {
      findSectionsByCampaignId: async () => [],
      findSectionById: async (id: number) => {
        if (id === 1) {
          return {
            id: 1,
            campagneId: 10,
            title: 'Section test',
            ordre: 1,
            defaultCollapse: false,
            banniere: '',
          };
        }
        return null;
      },
      createSection: async () => 1,
      updateSection: async (sectionId: number, data: any) => {
        updatedSectionData = { sectionId, data };
      },
      getMaxSectionOrdre: async () => 0,
      reorderSections: async () => {},
      createTopic: async () => 1,
      updateTopic: async () => {},
      getMaxTopicOrdre: async () => 0,
      reorderTopics: async () => {},
      findTopicById: async () => null,
      countPostsByTopicId: async () => 0,
      findPostsByTopicId: async () => [],
      getUserLastReadPostId: async () => null,
      countPostsAfterPostId: async () => 0,
      getPostById: async () => null,
      createPost: async () => 1,
      updateTopicLastPost: async () => {},
      markTopicAsRead: async () => {},
      findCampaignPersos: async () => [],
      findUserCampaignPersos: async () => [],
      isUserCampaignMj: async (campagneId: number, userId: number) => {
        return campagneId === 10 && userId === 1; // MJ is userId 1
      },
      isUserCampaignParticipant: async () => true,
      findPersoById: async () => null,
    };

    mockFileStorage = {
      saveUserAvatar: async () => '',
      saveCampaignFile: async (campaignId, filename, content) => {
        savedFiles.push({ campaignId, filename, content });
        return `/files/campaigns/${campaignId}/${filename}`;
      },
      savePostAttachment: async () => '',
      deleteCampaignFile: async () => {},
      deleteUserAvatar: async () => {},
      deletePostAttachment: async () => {},
    };

    useCase = new UploadSectionBannerUseCase(mockForumRepo, mockFileStorage);
  });

  it('téléverse avec succès une bannière pour une section', async () => {
    const fakeBuffer = Buffer.from('fake-image-bytes');
    const result = await useCase.execute({
      sectionId: 1,
      userId: 1,
      filename: 'banner.png',
      mimetype: 'image/png',
      content: fakeBuffer,
    });

    assert.equal(result.sectionId, 1);
    assert.match(result.url, /^\/files\/campaigns\/10\/[a-f0-9]+\.png$/);
    assert.equal(savedFiles.length, 1);
    assert.equal(savedFiles[0].campaignId, 10);
    assert.deepEqual(updatedSectionData, {
      sectionId: 1,
      data: {
        banniere: result.url,
      },
    });
  });

  it('lève une SectionNotFoundError si la section est introuvable', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 999,
          userId: 1,
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from('bytes'),
        });
      },
      (err: any) => {
        assert(err instanceof SectionNotFoundError);
        return true;
      }
    );
  });

  it('lève une ForbiddenError si l\'utilisateur n\'est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 2, // non-MJ
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from('bytes'),
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );
  });

  it('lève une ValidationError si le mimetype n\'est pas une image', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 1,
          userId: 1,
          filename: 'script.js',
          mimetype: 'application/javascript',
          content: Buffer.from('alert(1)'),
        });
      },
      (err: any) => {
        assert(err instanceof ValidationError);
        return true;
      }
    );
  });
});
