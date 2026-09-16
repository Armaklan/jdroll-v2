import { INoteRepository, noteRepository } from '../../repositories/note.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../../repositories/forum.repository.js';
import { Note } from '../../types/index.js';
import { CampaignNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';

export interface CreateNoteInput {
  campaignId: number;
  userId: number;
  content?: string;
}

export class CreateNoteUseCase {
  constructor(
    private readonly noteRepo: INoteRepository = noteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  async execute(input: CreateNoteInput): Promise<Note> {
    const campaign = await this.campaignRepo.findById(input.campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${input.campaignId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;
    const isParticipant = isMj ? false : await this.forumRepo.isUserCampaignParticipant(input.campaignId, input.userId);

    if (!isMj && !isParticipant) {
      throw new ForbiddenError('Vous devez être joueur ou MJ de la campagne pour créer des notes');
    }

    return this.noteRepo.createNote(input.campaignId, input.userId, input.content ?? '');
  }
}

export const createNoteUseCase = new CreateNoteUseCase();
