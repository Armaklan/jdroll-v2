import { ICarteRepository, carteRepository } from '../repositories/carte.repository.js';
import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { CarteDetail, CarteSummary, CarteConfig } from '../types/index.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../errors/domain.errors.js';

export class CarteQueries {
  constructor(
    private readonly carteRepo: ICarteRepository = carteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository
  ) {}

  /**
   * Récupère la liste des cartes d'une campagne.
   * Si l'utilisateur est le MJ, toutes les cartes sont renvoyées.
   * Sinon, seules les cartes publiées (published = 1) sont renvoyées.
   */
  async getCampaignCartes(campaignId: number, currentUserId?: number): Promise<CarteSummary[]> {
    const campaign = await this.campaignRepo.findById(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${campaignId} n'existe pas`);
    }

    const isMj = Boolean(currentUserId && campaign.mjId === currentUserId);
    return this.carteRepo.findByCampaignId(campaignId, isMj);
  }

  /**
   * Récupère les détails d'une carte par son identifiant avec la liste des personnages associés.
   * Si la carte n'est pas publiée et que l'utilisateur n'est pas le MJ, l'accès est refusé.
   */
  async getCarteById(carteId: number, currentUserId?: number): Promise<CarteDetail> {
    const carte = await this.carteRepo.findById(carteId);
    if (!carte) {
      throw new CarteNotFoundError(`La carte avec l'identifiant ${carteId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(carte.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${carte.campagneId} n'existe pas`);
    }

    const isMj = Boolean(currentUserId && campaign.mjId === currentUserId);

    if (!carte.published && !isMj) {
      throw new ForbiddenError("Vous n'avez pas accès à cette carte non publiée");
    }

    const characters = await this.campaignRepo.findCampaignCharacters(carte.campagneId);

    let parsedConfig: CarteConfig = { markers: [], tabReduce: false };
    if (carte.config) {
      try {
        parsedConfig = JSON.parse(carte.config);
      } catch {
        parsedConfig = { markers: [], tabReduce: false };
      }
    }

    return {
      id: carte.id,
      campagneId: carte.campagneId,
      name: carte.name,
      description: carte.description,
      image: carte.image,
      published: carte.published,
      config: parsedConfig,
      personnages: characters.map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.avatar || null,
        userId: c.userId || null,
        is_current_user: Boolean(currentUserId && c.userId === currentUserId),
      })),
      isMj,
      mjId: campaign.mjId,
    };
  }
}

export const carteQueries = new CarteQueries();
