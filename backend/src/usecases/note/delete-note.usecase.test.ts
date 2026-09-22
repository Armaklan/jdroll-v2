import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteNoteUseCase } from './delete-note.usecase.js';
import { INoteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { CampaignNotFoundError, ForbiddenError, NoteNotFoundError } from '../../errors/domain.errors.js';
import { CampaignSummary, Note } from '../../types/index.js';

describe('DeleteNoteUseCase', () => {
  let useCase: DeleteNoteUseCase;
  let mockNoteRepo: Partial<INoteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let mockForumRepo: Partial<IForumRepository>;

  const mockCampaign: CampaignSummary = {
    id: 10,
    name: 'Campagne Test',
    mjId: 1,
    mjUsername: 'MJ',
    nbJoueurs: 4,
    nbJoueursActuel: 1,
    banniere: '',
    banniereForum: null,
    systeme: 'Call of Cthulhu',
    univers: 'Horreur',
    description: 'Enquête sombre',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const storedNotes: Map<number, Note> = new Map();

  beforeEach(() => {
    storedNotes.clear();
    mockNoteRepo = {
      findById: async (id: number) => {
        return storedNotes.get(id) || null;
      },
      deleteNote: async (id: number) => {
        return storedNotes.delete(id);
      },
    };
    mockCampaignRepo = {
      findById: async (id: number) => (id === 10 ? mockCampaign : null),
    };
    mockForumRepo = {
      isUserCampaignParticipant: async (campaignId: number, userId: number) => {
        return campaignId === 10 && userId === 2;
      },
    };
    useCase = new DeleteNoteUseCase(
      mockNoteRepo as INoteRepository,
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository
    );
  });

  it('should delete note successfully when user is owner', async () => {
    storedNotes.set(100, {
      id: 100,
      campaignId: 10,
      userId: 2,
      content: '<p>Note à supprimer</p>',
      lastUpdate: '2026-09-16T10:00:00Z',
    });

    await useCase.execute({
      id: 100,
      campaignId: 10,
      userId: 2,
    });

    assert.equal(storedNotes.has(100), false);
  });

  it('should throw NoteNotFoundError when note does not exist', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          id: 999,
          campaignId: 10,
          userId: 2,
        }),
      NoteNotFoundError
    );
  });

  it('should throw ForbiddenError when user tries to delete another user note', async () => {
    storedNotes.set(100, {
      id: 100,
      campaignId: 10,
      userId: 1,
      content: '<p>Note du MJ</p>',
      lastUpdate: '2026-09-16T10:00:00Z',
    });

    await assert.rejects(
      () =>
        useCase.execute({
          id: 100,
          campaignId: 10,
          userId: 2,
        }),
      ForbiddenError
    );
  });

  it('should throw ForbiddenError when user is not participant and not MJ', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          id: 100,
          campaignId: 10,
          userId: 3,
        }),
      ForbiddenError
    );
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          id: 100,
          campaignId: 999,
          userId: 1,
        }),
      CampaignNotFoundError
    );
  });

  it('should delete note for general section (campaignId = 0) for any authenticated user', async () => {
    storedNotes.set(300, {
      id: 300,
      campaignId: 0,
      userId: 1,
      content: '<p>Note générale à supprimer</p>',
      lastUpdate: '2026-09-16T10:00:00Z',
    });

    await useCase.execute({
      id: 300,
      campaignId: 0,
      userId: 1,
    });

    assert.equal(storedNotes.has(300), false);
  });
});
