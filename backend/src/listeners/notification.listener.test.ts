import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationListener } from './notification.listener.js';
import { DomainEventBus } from '../events/event-bus.js';
import { ICampaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository } from '../repositories/forum.repository.js';
import { CreateOrUpdateNotificationUseCase } from '../usecases/notification/create-or-update-notification.usecase.js';
import { INotificationRepository } from '../repositories/notification.repository.js';

describe('NotificationListener', () => {
  let eventBus: DomainEventBus;
  let listener: NotificationListener;
  let notificationsCreated: any[];

  const mockCampaign = {
    id: 100,
    name: 'Campagne des Ombres',
    mjId: 1, // MJ is user 1
    mjUsername: 'MJ_User',
    nbJoueurs: 4,
    nbJoueursActuel: 2,
    banniere: '',
    systeme: 'D&D',
    univers: 'Fantasy',
    description: '',
    statut: 1,
    isArchived: false,
    isRecrutementOpen: false,
  };

  const mockParticipants = [
    { id: 2, username: 'Player2', avatar: null },
    { id: 3, username: 'Player3', avatar: null },
  ];

  const mockObservers = [
    { id: 4, username: 'Observer4', avatar: null },
  ];

  const mockCanReadUsers = [
    { id: 2, username: 'Player2', avatar: '' },
  ];

  beforeEach(() => {
    notificationsCreated = [];
    eventBus = new DomainEventBus();

    const mockCampaignRepo: Partial<ICampaignRepository> = {
      findById: async (id: number) => (id === 100 ? (mockCampaign as any) : null),
      findCampaignParticipants: async (id: number) => (id === 100 ? mockParticipants : []),
      findCampaignObservers: async (id: number) => (id === 100 ? mockObservers : []),
    };

    const mockForumRepo: Partial<IForumRepository> = {
      getTopicCanReadUsers: async (topicId: number) => (topicId === 20 ? mockCanReadUsers : []),
    };

    const mockNotifRepo: Partial<INotificationRepository> = {
      findNotification: async () => null,
      createNotification: async (data) => {
        notificationsCreated.push(data);
        return notificationsCreated.length;
      },
      updateNotification: async () => {},
    };

    const notifUseCase = new CreateOrUpdateNotificationUseCase(mockNotifRepo as INotificationRepository);

    listener = new NotificationListener(
      eventBus,
      mockCampaignRepo as ICampaignRepository,
      mockForumRepo as IForumRepository,
      notifUseCase
    );

    listener.register();
  });

  describe('PostCreated event', () => {
    it('should notify MJ, all participants and observers except the author in a public campaign topic', async () => {
      // User 2 (player) posts in a public topic
      await eventBus.publish({
        name: 'PostCreated',
        postId: 10,
        topicId: 15,
        campagneId: 100,
        userId: 2,
        topicTitle: 'Discussion générale',
        isPrivate: 0,
      });

      // Recipient should be MJ (1), Player3 (3), and Observer4 (4), excluding Player2 (2)
      assert.equal(notificationsCreated.length, 3);
      const notifiedUserIds = notificationsCreated.map((n) => n.userId).sort();
      assert.deepEqual(notifiedUserIds, [1, 3, 4]);
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Nouveau post');
      assert.equal(
        notificationsCreated[0].content,
        'Nouveau message dans le sujet <a href="/forum/100/15/page/1#post10">Discussion générale</a>'
      );
      assert.equal(notificationsCreated[0].type, 'topic');
      assert.equal(notificationsCreated[0].targetId, 15);
      assert.equal(notificationsCreated[0].url, '/forum/100/15/page/1#post10');
    });

    it('should notify only MJ and can_read users except the author in a private topic', async () => {
      // MJ (1) posts in private topic 20 (where Player 2 can read)
      await eventBus.publish({
        name: 'PostCreated',
        postId: 11,
        topicId: 20,
        campagneId: 100,
        userId: 1, // MJ posts
        topicTitle: 'Secret du MJ',
        isPrivate: 1,
      });

      // Recipient should only be Player 2 (2)
      assert.equal(notificationsCreated.length, 1);
      assert.equal(notificationsCreated[0].userId, 2);
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Nouveau post');
      assert.equal(
        notificationsCreated[0].content,
        'Nouveau message dans le sujet <a href="/forum/100/20/page/1#post11">Secret du MJ</a>'
      );
      assert.equal(notificationsCreated[0].url, '/forum/100/20/page/1#post11');
    });

    it('should notify with Forum prefix when topic is outside a campaign', async () => {
      await eventBus.publish({
        name: 'PostCreated',
        postId: 12,
        topicId: 20,
        campagneId: null,
        userId: 1,
        topicTitle: 'Discussion libre',
        isPrivate: 1,
      });

      assert.equal(notificationsCreated.length, 1);
      assert.equal(notificationsCreated[0].userId, 2);
      assert.equal(notificationsCreated[0].title, 'Forum - Nouveau post');
      assert.equal(
        notificationsCreated[0].content,
        'Nouveau message dans le sujet <a href="/forum/0/20/page/1#post12">Discussion libre</a>'
      );
    });
  });

  describe('RollCreated event', () => {
    it('should notify only the MJ when rolled in dice tower', async () => {
      // Player 2 rolls in dice tower
      await eventBus.publish({
        name: 'RollCreated',
        rollId: 50,
        campagneId: 100,
        userId: 2,
        isTower: true,
        formula: '1d20+3',
        result: '18',
      });

      assert.equal(notificationsCreated.length, 1);
      assert.equal(notificationsCreated[0].userId, 1); // MJ
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Jet de dé');
      assert.equal(
        notificationsCreated[0].content,
        'Nouveau jet de dés dans <a href="/campaigns/100/dice">la tour à dés</a> : 1d20+3 (18)'
      );
      assert.equal(notificationsCreated[0].type, 'dice');
      assert.equal(notificationsCreated[0].targetId, 100);
      assert.equal(notificationsCreated[0].url, '/campaigns/100/dice');
    });

    it('should not notify the MJ if the MJ themselves rolled in the dice tower', async () => {
      // MJ (1) rolls in dice tower
      await eventBus.publish({
        name: 'RollCreated',
        rollId: 51,
        campagneId: 100,
        userId: 1,
        isTower: true,
        formula: '1d20+3',
        result: '18',
      });

      assert.equal(notificationsCreated.length, 0);
    });

    it('should notify campaign participants and observers when rolled in a topic post', async () => {
      // Player 2 rolls in public topic 15
      await eventBus.publish({
        name: 'RollCreated',
        rollId: 52,
        campagneId: 100,
        userId: 2,
        topicId: 15,
        topicTitle: 'Combat',
        isPrivate: 0,
        isTower: false,
        formula: '1d100',
        result: '42',
      });

      assert.equal(notificationsCreated.length, 3);
      const notifiedUserIds = notificationsCreated.map((n) => n.userId).sort();
      assert.deepEqual(notifiedUserIds, [1, 3, 4]);
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Jet de dé');
      assert.equal(
        notificationsCreated[0].content,
        'Nouveau jet de dé dans le sujet <a href="/forum/100/15/page/1">Combat</a>'
      );
    });
  });

  describe('CharacterUpdated event', () => {
    it('should notify MJ and character owner when character is modified by player', async () => {
      // Player 2 modifies their character (owner = 2, MJ = 1)
      await eventBus.publish({
        name: 'CharacterUpdated',
        characterId: 77,
        campagneId: 100,
        characterName: 'Valeros',
        characterOwnerId: 2,
        modifierUserId: 2,
      });

      // Recipient is MJ (1)
      assert.equal(notificationsCreated.length, 1);
      assert.equal(notificationsCreated[0].userId, 1);
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Modification de personnage');
      assert.equal(
        notificationsCreated[0].content,
        'Le personnage <a href="/campaigns/100/characters">Valeros</a> a été mis à jour'
      );
      assert.equal(notificationsCreated[0].type, 'perso');
      assert.equal(notificationsCreated[0].targetId, 77);
      assert.equal(notificationsCreated[0].url, '/campaigns/100/characters');
    });

    it('should notify character owner when character is modified by MJ', async () => {
      // MJ (1) modifies player 2's character
      await eventBus.publish({
        name: 'CharacterUpdated',
        characterId: 77,
        campagneId: 100,
        characterName: 'Valeros',
        characterOwnerId: 2,
        modifierUserId: 1,
      });

      // Recipient is Player 2 (2)
      assert.equal(notificationsCreated.length, 1);
      assert.equal(notificationsCreated[0].userId, 2);
      assert.equal(notificationsCreated[0].title, 'Campagne des Ombres - Modification de personnage');
      assert.equal(
        notificationsCreated[0].content,
        'Le personnage <a href="/campaigns/100/characters">Valeros</a> a été mis à jour'
      );
    });
  });
});
