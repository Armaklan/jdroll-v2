import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NoteQueries } from './note.queries.js';
import { INoteRepository } from '../repositories/note.repository.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import { CampaignNotFoundError, ForbiddenError } from '../errors/domain.errors.js';
import { CampaignSummary, Note } from '../types/index.js';

describe('NoteQueries', () => {
  let queries: NoteQueries;
  let mockNoteRepo: Partial<INoteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;
  let mockForumRepo: Partial<IForumRepository>;

  const mockCampaign: CampaignSummary = {
    id: 42,
    name: 'Chronique des Héros',
    mjId: 1,
    mjUsername: 'Maître',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    banniereForum: null,
    systeme: 'D&D 5e',
    univers: 'Fantasy',
    description: 'Une grande aventure',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
  };

  const storedNotes: Note[] = [];

  beforeEach(() => {
    storedNotes.length = 0;
    mockNoteRepo = {
      findAllByUserAndCampaign: async (userId: number, campaignId: number) => {
        return storedNotes.filter((n) => n.campaignId === campaignId && n.userId === userId);
      },
    };
    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
      isUserCampaignAlert: async () => false,
      isUserObservingCampaign: async (_cId: number, userId: number) => userId === 3,
    };
    mockForumRepo = {
      isUserCampaignParticipant: async (campaignId: number, userId: number) => {
        return campaignId === 42 && userId === 2;
      },
    };
    queries = new NoteQueries(
      mockNoteRepo as INoteRepository,
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository
    );
  });

  it('should return notes and campaign data for MJ', async () => {
    storedNotes.push({
      id: 101,
      campaignId: 42,
      userId: 1,
      content: '<p>Secret du MJ</p>',
      lastUpdate: '2026-09-16T12:00:00Z',
    });
    storedNotes.push({
      id: 102,
      campaignId: 42,
      userId: 1,
      content: '<p>Deuxième note du MJ</p>',
      lastUpdate: '2026-09-16T13:00:00Z',
    });

    const result = await queries.getCampaignNotes(42, 1);
    assert.equal(result.campaign.id, 42);
    assert.equal(result.campaign.userRole, 'mj');
    assert.equal(result.notes.length, 2);
    assert.equal(result.notes[0].id, 101);
    assert.equal(result.notes[1].id, 102);
  });

  it('should return empty notes list for player without existing notes', async () => {
    const result = await queries.getCampaignNotes(42, 2);
    assert.equal(result.campaign.id, 42);
    assert.equal(result.campaign.userRole, 'player');
    assert.deepEqual(result.notes, []);
  });

  it('should throw ForbiddenError when user is an observer', async () => {
    await assert.rejects(
      () => queries.getCampaignNotes(42, 3),
      ForbiddenError
    );
  });

  it('should throw ForbiddenError when user is not participant and not MJ', async () => {
    await assert.rejects(
      () => queries.getCampaignNotes(42, 99),
      ForbiddenError
    );
  });

  it('should throw CampaignNotFoundError when campaign does not exist', async () => {
    await assert.rejects(
      () => queries.getCampaignNotes(999, 1),
      CampaignNotFoundError
    );
  });
});
