import { ICarteRepository, carteRepository, UpdateCarteData } from '../../repositories/carte.repository.js';
import { ICampaignRepository, campaignRepository } from '../../repositories/campaign.repository.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../../errors/domain.errors.js';
import { CarteConfig, CarteMarker } from '../../types/index.js';

export interface UpdateCarteInput {
  carteId: number;
  userId: number;
  name?: string;
  description?: string;
  image?: string;
  published?: boolean;
  config?: CarteConfig | string;
}

export class UpdateCarteUseCase {
  constructor(
    private readonly carteRepo: ICarteRepository = carteRepository,
    private readonly campaignRepo: ICampaignRepository = campaignRepository
  ) {}

  async execute(input: UpdateCarteInput): Promise<void> {
    const carte = await this.carteRepo.findById(input.carteId);
    if (!carte) {
      throw new CarteNotFoundError(`La carte avec l'identifiant ${input.carteId} n'existe pas`);
    }

    const campaign = await this.campaignRepo.findById(carte.campagneId);
    if (!campaign) {
      throw new CampaignNotFoundError(`La campagne avec l'identifiant ${carte.campagneId} n'existe pas`);
    }

    const isMj = campaign.mjId === input.userId;

    if (!carte.published && !isMj) {
      throw new ForbiddenError("Vous n'avez pas accès à cette carte non publiée");
    }

    if (isMj) {
      const dataToUpdate: UpdateCarteData = {};
      if (input.name !== undefined) dataToUpdate.name = input.name.trim();
      if (input.description !== undefined) dataToUpdate.description = input.description.trim();
      if (input.image !== undefined) dataToUpdate.image = input.image.trim();
      if (input.published !== undefined) dataToUpdate.published = input.published;
      if (input.config !== undefined) {
        dataToUpdate.config = typeof input.config === 'string' ? input.config : JSON.stringify(input.config);
      }

      await this.carteRepo.updateCarte(input.carteId, dataToUpdate);
      return;
    }

    // Joueur : seul le déplacement des tokens des personnages affectés à ce joueur est autorisé
    const characters = await this.campaignRepo.findCampaignCharacters(carte.campagneId);
    const userCharIds = characters
      .filter((c) => c.userId === input.userId)
      .map((c) => String(c.id));

    if (userCharIds.length === 0) {
      throw new ForbiddenError("Vous n'avez aucun personnage affecté dans cette campagne pour déplacer des pions");
    }

    if (input.config === undefined) {
      return;
    }

    let existingConfig: CarteConfig = { markers: [], tabReduce: false };
    if (carte.config) {
      try {
        existingConfig = JSON.parse(carte.config);
      } catch {
        existingConfig = { markers: [], tabReduce: false };
      }
    }

    let incomingConfig: CarteConfig = { markers: [] };
    if (typeof input.config === 'string') {
      try {
        incomingConfig = JSON.parse(input.config);
      } catch {
        incomingConfig = { markers: [] };
      }
    } else {
      incomingConfig = input.config;
    }

    const existingMarkers: CarteMarker[] = existingConfig.markers || [];
    const incomingMarkers: CarteMarker[] = incomingConfig.markers || [];

    // On fusionne les marqueurs :
    // 1. Les marqueurs existants qui n'appartiennent pas au joueur sont conservés intacts
    // 2. Les marqueurs existants du joueur sont mis à jour si présents dans incoming
    const mergedMarkers: CarteMarker[] = existingMarkers.map((existingMarker) => {
      const isOwnedByUser = existingMarker.type === 'perso' && userCharIds.includes(String(existingMarker.id));
      if (!isOwnedByUser) {
        return existingMarker;
      }

      const matchingIncoming = incomingMarkers.find(
        (m) => m.type === 'perso' && String(m.id) === String(existingMarker.id)
      );

      if (matchingIncoming && matchingIncoming.position) {
        return {
          ...existingMarker,
          position: matchingIncoming.position,
          popup: matchingIncoming.popup !== undefined ? matchingIncoming.popup : existingMarker.popup,
        };
      }

      return existingMarker;
    });

    // 3. Si le joueur ajoute un nouveau pion de son personnage qui n'était pas encore sur la carte
    for (const incomingMarker of incomingMarkers) {
      const isOwnedByUser = incomingMarker.type === 'perso' && userCharIds.includes(String(incomingMarker.id));
      if (isOwnedByUser && incomingMarker.position) {
        const alreadyInMerged = mergedMarkers.some(
          (m) => m.type === 'perso' && String(m.id) === String(incomingMarker.id)
        );
        if (!alreadyInMerged) {
          mergedMarkers.push({
            type: 'perso',
            id: String(incomingMarker.id),
            position: incomingMarker.position,
            popup: incomingMarker.popup !== undefined ? incomingMarker.popup : { text: '' },
          });
        }
      }
    }

    const finalConfig: CarteConfig = {
      ...existingConfig,
      markers: mergedMarkers,
    };

    await this.carteRepo.updateCarte(input.carteId, {
      config: JSON.stringify(finalConfig),
    });
  }
}

export const updateCarteUseCase = new UpdateCarteUseCase();
