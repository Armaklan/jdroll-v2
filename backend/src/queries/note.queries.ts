import { INoteRepository, noteRepository } from '../repositories/note.repository.js';
import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import { Note, CampaignNotesData, CampaignSummary } from '../types/index.js';
import { CampaignNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

export class NoteQueries {
  constructor(
    private readonly noteRepo: INoteRepository = noteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository
  ) {}

  /**
   * Récupère les notes personnelles d'un joueur ou du MJ pour une campagne donnée
   */
  async getCampaignNotes(campaignId: number, userId: number): Promise<CampaignNotesData> {
    let campaign: CampaignSummary | null = null;
    let userRole: 'mj' | 'player' | 'observer' | undefined = undefined;
    let isObserving = false;
    let hasAlert = false;

    // Pour la partie générale (campaignId = 0), on autorise tous les utilisateurs
    if (campaignId === 0) {
      userRole = 'player';
    } else {
      campaign = await this.campaignRepo.findById(campaignId);
      if (!campaign) {
        throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
      }

      if (this.campaignRepo.isUserCampaignAlert) {
        hasAlert = await this.campaignRepo.isUserCampaignAlert(campaignId, userId);
      }

      if (campaign.mjId === userId) {
        userRole = 'mj';
      } else {
        const isParticipant = await this.forumRepo.isUserCampaignParticipant(campaignId, userId);
        if (isParticipant) {
          userRole = 'player';
        } else {
          isObserving = await this.campaignRepo.isUserCampaignObserver(campaignId, userId);
          if (isObserving) {
            userRole = 'observer';
          }
        }
      }

      if (userRole !== 'mj' && userRole !== 'player') {
        throw new ForbiddenError('Vous devez être joueur ou MJ de la campagne pour accéder aux notes');
      }
    }

    const notes = await this.noteRepo.findAllByUserAndCampaign(userId, campaignId);

    // Pour la partie générale, on ne retourne pas d'info de campagne
    if (campaignId === 0) {
      return {
        campaign: null,
        notes,
      };
    }

    return {
      campaign: {
        ...campaign!,
        userRole,
        isObserving,
        hasAlert,
      },
      notes,
    };
  }
}

export const noteQueries = new NoteQueries();
