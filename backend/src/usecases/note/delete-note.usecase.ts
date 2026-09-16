import { INoteRepository, noteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { CampaignNotFoundError, ForbiddenError, NoteNotFoundError } from '../../errors/domain.errors.js';

export interface DeleteNoteInput {
  id: number;
  campaignId: number;
  userId: number;
}

export class DeleteNoteUseCase {
  constructor(
    private readonly noteRepo: INoteRepository = noteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(input: DeleteNoteInput): Promise<void> {
    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    const isParticipant = isMj ? false : await this.forumRepo.isUserCampaignParticipant(input.campaignId, input.userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError('Vous devez être joueur ou MJ de la campagne pour supprimer vos notes');
    }

    const existingNote = await this.noteRepo.findById(input.id);
    if (!existingNote) {
      throw new NoteNotFoundError(`La note avec l'identifiant ${input.id} n'existe pas`);
    }

    if (existingNote.campaignId !== input.campaignId || existingNote.userId !== input.userId) {
      throw new ForbiddenError('Vous ne pouvez supprimer que vos propres notes de cette campagne');
    }

    await this.noteRepo.deleteNote(input.id);
  }
}

export const deleteNoteUseCase = new DeleteNoteUseCase();
