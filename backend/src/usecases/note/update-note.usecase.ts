import { INoteRepository, noteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { Note } from '../../types/index.js';
import { CampaignNotFoundError, ForbiddenError, NoteNotFoundError } from '../../errors/domain.errors.js';

export interface UpdateNoteInput {
  id: number;
  campaignId: number;
  userId: number;
  content: string;
}

export class UpdateNoteUseCase {
  constructor(
    private readonly noteRepo: INoteRepository = noteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(input: UpdateNoteInput): Promise<Note> {
    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    const isParticipant = isMj ? false : await this.forumRepo.isUserCampaignParticipant(input.campaignId, input.userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError('Vous devez être joueur ou MJ de la campagne pour modifier vos notes');
    }

    const existingNote = await this.noteRepo.findById(input.id);
    if (!existingNote) {
      throw new NoteNotFoundError(`La note avec l'identifiant ${input.id} n'existe pas`);
    }

    if (existingNote.campaignId !== input.campaignId || existingNote.userId !== input.userId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres notes de cette campagne');
    }

    const updated = await this.noteRepo.updateNote(input.id, input.content);
    if (!updated) {
      throw new NoteNotFoundError(`La note avec l'identifiant ${input.id} n'existe pas`);
    }

    return updated;
  }
}

export const updateNoteUseCase = new UpdateNoteUseCase();
