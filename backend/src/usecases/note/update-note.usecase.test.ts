import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateNoteUseCase } from './update-note.usecase.js';
import { INoteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { CampaignNotFoundError, ForbiddenError, NoteNotFoundError } from '../../errors/domain.errors.js';
import { CampaignSummary, Note } from '../../types/index.js';

describe('UpdateNoteUseCase', () => {
  let useCase: UpdateNoteUseCase;
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
      updateNote: async (id: number, content: string) => {
        const existing = storedNotes.get(id);
        if (!existing) return null;
        const updated = {
          ...existing,
          content,
          lastUpdate: '2026-09-16T13:00:00Z',
        };
        storedNotes.set(id, updated);
        return updated;
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
    useCase = new UpdateNoteUseCase(
      mockNoteRepo as INoteRepository,
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository
    );
  });

  it('should update note successfully when user is owner', async () => {
    storedNotes.set(100, {
      id: 100,
      campaignId: 10,
      userId: 2,
      content: '<p>Ancien contenu</p>',
      lastUpdate: '2026-09-16T10:00:00Z',
    });

    const updated = await useCase.execute({
      id: 100,
      campaignId: 10,
      userId: 2,
      content: '<p>Nouveau contenu mis à jour</p>',
    });

    assert.equal(updated.content, '<p>Nouveau contenu mis à jour</p>');
    assert.equal(storedNotes.get(100)?.content, '<p>Nouveau contenu mis à jour</p>');
  });

  it('should throw NoteNotFoundError when note does not exist', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          id: 999,
          campaignId: 10,
          userId: 2,
          content: '<p>Nouveau</p>',
        }),
      NoteNotFoundError
    );
  });

  it('should throw ForbiddenError when user tries to update another user note', async () => {
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
          content: '<p>Modification pirate</p>',
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
          content: '<p>Test</p>',
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
          content: '<p>Test</p>',
        }),
      CampaignNotFoundError
    );
  });
});
