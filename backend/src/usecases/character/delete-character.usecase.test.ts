import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteCharacterUseCase } from './delete-character.usecase.js';
import { ICampaignRepository } from '../../repositories/campaign.repository.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  ForbiddenError,
} from '../../errors/domain.errors.js';

describe('DeleteCharacterUseCase', () => {
  let mockCampaignRepo: ICampaignRepository;
  let useCase: DeleteCharacterUseCase;
  let deletedCharacterIds: number[] = [];

  beforeEach(() => {
    deletedCharacterIds = [];
    mockCampaignRepo = {
      findMasteredCampaigns: async () => [],
      findPlayerCampaigns: async () => [],
      findObservedCampaigns: async () => [],
      findAllCampaigns: async () => [],
      findById: async (id: number) => {
        if (id === 10) {
          return {
            id: 10,
            name: 'Campagne Test',
            mjId: 1,
            mjUsername: 'GM',
            nbJoueurs: 4,
            nbJoueursActuel: 1,
            banniere: '',
            systeme: 'D&D',
            univers: 'Fantasy',
            description: '',
            statut: 1,
            isArchived: false,
            isRecrutementOpen: false,
          };
        }
        return null;
      },
      createCampaign: async () => 1,
      updateCampaign: async () => {},
      findCampaignCharacters: async () => [],
      findCampaignPnjCategories: async () => [],
      findPnjCategoryById: async () => null,
      createPnjCategory: async () => 1,
      updatePnjCategory: async () => {},
      deletePnjCategory: async () => {},
      findCharacterById: async (id: number) => {
        if (id === 42) {
          return {
            id: 42,
            campagneId: 10,
            userId: 5,
            userName: 'Player1',
            userAvatar: null,
            name: 'Gandalf',
            concept: 'Magicien',
            avatar: 'http://img.png',
            publicDescription: 'Vieux sage',
            privateDescription: 'Secret',
            technical: 'Stats',
            statut: 1,
            catId: null,
            categoryName: null,
            persoFields: null,
            widgets: '',
          };
        }
        return null;
      },
      createCharacter: async () => 1,
      updateCharacter: async () => {},
      deleteCharacter: async (id: number) => {
        deletedCharacterIds.push(id);
      },
      updateCampaignBanner: async () => {},
      findCampaignParticipants: async () => [],
      isUserCampaignParticipant: async () => false,
      addCampaignParticipant: async () => {},
      isUserCampaignObserver: async () => false,
      addCampaignObserver: async () => {},
      removeCampaignObserver: async () => {},
      findCampaignObservers: async () => [],
      isUserCampaignAlert: async () => false,
      addCampaignAlert: async () => {},
      removeCampaignAlert: async () => {},
    };

    useCase = new DeleteCharacterUseCase(mockCampaignRepo);
  });

  it('devrait supprimer un personnage avec succès si l utilisateur est le MJ', async () => {
    const result = await useCase.execute({
      characterId: 42,
      userId: 1, // MJ
    });

    assert.deepEqual(result, {
      success: true,
      characterId: 42,
    });
    assert.deepEqual(deletedCharacterIds, [42]);
  });

  it('devrait lever une CharacterNotFoundError si le personnage n existe pas', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 999,
          userId: 1,
        });
      },
      (err: any) => {
        assert(err instanceof CharacterNotFoundError);
        return true;
      }
    );
  });

  it('devrait lever une CampaignNotFoundError si la campagne n existe pas', async () => {
    // Modifier findById pour renvoyer null même pour 10
    mockCampaignRepo.findById = async () => null;

    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 42,
          userId: 1,
        });
      },
      (err: any) => {
        assert(err instanceof CampaignNotFoundError);
        return true;
      }
    );
  });

  it('devrait lever une ForbiddenError si l utilisateur n est pas le MJ', async () => {
    await assert.rejects(
      async () => {
        await useCase.execute({
          characterId: 42,
          userId: 5, // Non-MJ
        });
      },
      (err: any) => {
        assert(err instanceof ForbiddenError);
        return true;
      }
    );

    assert.equal(deletedCharacterIds.length, 0);
  });
});
