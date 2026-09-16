import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CarteQueries } from './carte.queries.js';
import { ICarteRepository, CarteRecord } from '../repositories/carte.repository.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { CampaignNotFoundError, CarteNotFoundError, ForbiddenError } from '../errors/domain.errors.js';
import { CampaignSummary, CarteSummary, RawCampaignCharacterRow } from '../types/index.js';

describe('CarteQueries', () => {
  let queries: CarteQueries;
  let mockCarteRepo: Partial<ICarteRepository>;
  let mockCampaignRepo: Partial<ICampaignRepository>;

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

  const storedCartes: CarteRecord[] = [];
  const storedCharacters: RawCampaignCharacterRow[] = [];

  beforeEach(() => {
    storedCartes.length = 0;
    storedCharacters.length = 0;

    mockCarteRepo = {
      findByCampaignId: async (campaignId: number, withUnpublished: boolean = false) => {
        return storedCartes
          .filter((c) => c.campagneId === campaignId && (withUnpublished || c.published))
          .map((c) => ({
            id: c.id,
            campagneId: c.campagneId,
            name: c.name,
            description: c.description,
            image: c.image,
            published: c.published,
          }));
      },
      findById: async (id: number) => {
        const found = storedCartes.find((c) => c.id === id);
        return found || null;
      },
    };

    mockCampaignRepo = {
      findById: async (id: number) => (id === 42 ? mockCampaign : null),
      findCampaignCharacters: async (campaignId: number) =>
        storedCharacters.filter((c) => c.campagneId === campaignId),
    };

    queries = new CarteQueries(
      mockCarteRepo as ICarteRepository,
      mockCampaignRepo as ICampaignRepository
    );
  });

  describe('getCampaignCartes', () => {
    it('should return all cartes (including unpublished) for MJ', async () => {
      storedCartes.push(
        {
          id: 1,
          campagneId: 42,
          name: 'Donjon Secret',
          description: 'Non publié',
          image: '/carte1.png',
          published: false,
          config: '{}',
          mjId: 1,
        },
        {
          id: 2,
          campagneId: 42,
          name: 'Taverne',
          description: 'Publié',
          image: '/carte2.png',
          published: true,
          config: '{}',
          mjId: 1,
        }
      );

      const result = await queries.getCampaignCartes(42, 1);
      assert.equal(result.length, 2);
    });

    it('should return only published cartes for players or visitors', async () => {
      storedCartes.push(
        {
          id: 1,
          campagneId: 42,
          name: 'Donjon Secret',
          description: 'Non publié',
          image: '/carte1.png',
          published: false,
          config: '{}',
          mjId: 1,
        },
        {
          id: 2,
          campagneId: 42,
          name: 'Taverne',
          description: 'Publié',
          image: '/carte2.png',
          published: true,
          config: '{}',
          mjId: 1,
        }
      );

      const result = await queries.getCampaignCartes(42, 2); // player with userId = 2
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 2);
      assert.equal(result[0].name, 'Taverne');
    });

    it('should throw CampaignNotFoundError when campaign does not exist', async () => {
      await assert.rejects(() => queries.getCampaignCartes(999, 1), CampaignNotFoundError);
    });
  });

  describe('getCarteById', () => {
    it('should return carte details and characters with is_current_user correctly calculated', async () => {
      storedCartes.push({
        id: 10,
        campagneId: 42,
        name: 'Plaine de bataille',
        description: 'Zone de combat',
        image: '/files/42/battle.jpg',
        published: true,
        config: '{"markers":[{"type":"perso","id":"101","position":[10,20]}],"tabReduce":false}',
        mjId: 1,
      });

      storedCharacters.push(
        {
          id: 101,
          campagneId: 42,
          userId: 2,
          userName: 'Joueur1',
          userAvatar: null,
          name: 'Aragorn',
          concept: 'Rôdeur',
          avatar: '/aragorn.png',
          publicDescription: '',
          privateDescription: '',
          technical: '',
          statut: 0,
          catId: null,
          categoryName: '',
        },
        {
          id: 102,
          campagneId: 42,
          userId: 3,
          userName: 'Joueur2',
          userAvatar: null,
          name: 'Legolas',
          concept: 'Elfe',
          avatar: '/legolas.png',
          publicDescription: '',
          privateDescription: '',
          technical: '',
          statut: 0,
          catId: null,
          categoryName: '',
        }
      );

      const result = await queries.getCarteById(10, 2);
      assert.equal(result.id, 10);
      assert.equal(result.name, 'Plaine de bataille');
      assert.equal(result.isMj, false);
      assert.equal(result.personnages.length, 2);

      const aragorn = result.personnages.find((p) => p.id === 101);
      const legolas = result.personnages.find((p) => p.id === 102);
      assert.equal(aragorn?.is_current_user, true);
      assert.equal(legolas?.is_current_user, false);
      assert.equal(result.config.markers?.length, 1);
    });

    it('should throw ForbiddenError if carte is not published and user is not MJ', async () => {
      storedCartes.push({
        id: 11,
        campagneId: 42,
        name: 'Plan secret',
        description: '',
        image: '/secret.png',
        published: false,
        config: '{}',
        mjId: 1,
      });

      await assert.rejects(() => queries.getCarteById(11, 2), ForbiddenError);
    });

    it('should allow MJ to access unpublished carte', async () => {
      storedCartes.push({
        id: 11,
        campagneId: 42,
        name: 'Plan secret',
        description: '',
        image: '/secret.png',
        published: false,
        config: '{}',
        mjId: 1,
      });

      const result = await queries.getCarteById(11, 1);
      assert.equal(result.id, 11);
      assert.equal(result.isMj, true);
    });

    it('should throw CarteNotFoundError if carte does not exist', async () => {
      await assert.rejects(() => queries.getCarteById(999, 1), CarteNotFoundError);
    });
  });
});
