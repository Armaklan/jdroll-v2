import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateNoteUseCase } from './create-note.usecase.js';
import { INoteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository } from '../../repositories/forum.repository.js';
import { CampaignNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { CampaignSummary, Note } from '../../types/index.js';

describe('CreateNoteUseCase', () => {
  let useCase: CreateNoteUseCase;
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

  const storedNotes: Note[] = [];

  beforeEach(() => {
    storedNotes.length = 0;
    mockNoteRepo = {
      createNote: async (campaignId: number, userId: number, content: string) => {
        const note: Note = {
          id: storedNotes.length + 1,
          campaignId,
          userId,
          content,
          lastUpdate: '2026-09-16T12:00:00Z',
        };
        storedNotes.push(note);
        return note;
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
    useCase = new CreateNoteUseCase(
      mockNoteRepo as INoteRepository,
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository
    );
  });

  it('should create note for MJ successfully', async () => {
    const note = await useCase.execute({
      campaignId: 10,
      userId: 1,
      content: '<p>Plan secret du scénario</p>',
    });

    assert.equal(note.campaignId, 10);
    assert.equal(note.userId, 1);
    assert.equal(note.content, '<p>Plan secret du scénario</p>');
    assert.equal(storedNotes.length, 1);
  });

  it('should create note for player successfully', async () => {
    const note = await useCase.execute({
      campaignId: 10,
      userId: 2,
      content: '<p>Indices trouvés dans le manoir</p>',
    });

    assert.equal(note.campaignId, 10);
    assert.equal(note.userId, 2);
    assert.equal(note.content, '<p>Indices trouvés dans le manoir</p>');
    assert.equal(storedNotes.length, 1);
  });

  it('should create empty note if content is omitted', async () => {
    const note = await useCase.execute({
      campaignId: 10,
      userId: 2,
    });

    assert.equal(note.content, '');
    assert.equal(storedNotes.length, 1);
  });

  it('should throw ForbiddenError when user is not MJ and not participant', async () => {
    await assert.rejects(
      () =>
        useCase.execute({
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
          campaignId: 999,
          userId: 1,
          content: '<p>Test</p>',
        }),
      CampaignNotFoundError
    );
  });
});
