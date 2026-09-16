import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UploadSectionBannerUseCase } from './upload-section-banner.usecase.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { IFileStorage } from '../../storage/file-storage.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import {
  SectionNotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../errors/domain.errors.js';

describe('UploadSectionBannerUseCase', () => {
  let useCase: UploadSectionBannerUseCase;
  let mockForumRepo: IForumRepository;
  let mockFileStorage: IFileStorage;
  let mockUserRepo: IUserRepository;
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
        if (id === 2) {
          return {
            id: 2,
            campagneId: null, // Forum général
            title: 'Section Générale',
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
      findFirstUnreadPost: async () => null,
      findFirstPost: async () => null,
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
      getTopicCanReadUsers: async () => [],
      getCanReadUsersByTopicIds: async () => new Map(),
      setTopicCanReadUsers: async () => {},
      isUserTopicCanRead: async () => false,
    };

    mockFileStorage = {
      saveCampaignFile: async (campaignId, filename, content) => {
        savedFiles.push({ campaignId, filename, content });
        return `/files/campaigns/${campaignId}/${filename}`;
      },
    };

    mockUserRepo = {
      findById: async (id: number) => ({
        id,
        username: `user${id}`,
        mail: `user${id}@test.com`,
        profil: id === 100 ? 2 : 0, // id 100 is admin
        avatar: '',
        description: '',
        titre: '',
      }),
      findByUsernameOrEmail: async () => null,
      findByUsernames: async () => [],
      searchByUsername: async () => [],
      existsByUsernameOrEmail: async () => false,
      create: async (d) => ({ id: 999, ...d, avatar: '', description: '', profil: 0, titre: '' }),
    };

    useCase = new UploadSectionBannerUseCase(mockForumRepo, mockFileStorage, mockUserRepo);
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
  it('permet à un administrateur de téléverser une bannière pour une section du forum général', async () => {
    const fakeBuffer = Buffer.from('fake-image-bytes');
    const result = await useCase.execute({
      sectionId: 2,
      userId: 100, // Admin
      userProfil: 2,
      filename: 'general-banner.png',
      mimetype: 'image/png',
      content: fakeBuffer,
    });

    assert.equal(result.sectionId, 2);
    assert.match(result.url, /^\/files\/campaigns\/0\/[a-f0-9]+\.png$/);
    assert.equal(savedFiles.length, 1);
    assert.equal(savedFiles[0].campaignId, 0);
  });

  it('interdit à un joueur standard de téléverser une bannière pour une section du forum général', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          sectionId: 2,
          userId: 10,
          userProfil: 0,
          filename: 'banner.png',
          mimetype: 'image/png',
          content: Buffer.from('bytes'),
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        assert.match(err.message, /administrateur/);
        return true;
      }
    );
  });
});
