import { IEventBus, domainEventBus } from '../events/event-bus.js';
import {
  PostCreatedEvent,
  RollCreatedEvent,
  CharacterUpdatedEvent,
  ParticipantValidatedEvent,
  ParticipantRejectedEvent,
  ParticipantExcludedEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
} from '../events/events.js';
import { ICampaignRepository, campaignRepository } from '../repositories/campaign.repository.js';
import { IForumRepository, forumRepository } from '../repositories/forum.repository.js';
import {
  CreateOrUpdateNotificationUseCase,
  createOrUpdateNotificationUseCase,
} from '../usecases/notification/create-or-update-notification.usecase.js';

export class NotificationListener {
  private isRegistered = false;

  constructor(
    private readonly eventBus: IEventBus = domainEventBus,
    private readonly campaignRepo: ICampaignRepository = campaignRepository,
    private readonly forumRepo: IForumRepository = forumRepository,
    private readonly notifUseCase: CreateOrUpdateNotificationUseCase = createOrUpdateNotificationUseCase
  ) {}

  register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;
    this.eventBus.subscribe<PostCreatedEvent>('PostCreated', (event) => this.handlePostCreated(event));
    this.eventBus.subscribe<RollCreatedEvent>('RollCreated', (event) => this.handleRollCreated(event));
    this.eventBus.subscribe<CharacterUpdatedEvent>('CharacterUpdated', (event) =>
      this.handleCharacterUpdated(event)
    );
    this.eventBus.subscribe<ParticipantValidatedEvent>(
      'ParticipantValidated',
      (event) => this.handleParticipantValidated(event)
    );
    this.eventBus.subscribe<ParticipantRejectedEvent>(
      'ParticipantRejected',
      (event) => this.handleParticipantRejected(event)
    );
    this.eventBus.subscribe<ParticipantExcludedEvent>(
      'ParticipantExcluded',
      (event) => this.handleParticipantExcluded(event)
    );
    this.eventBus.subscribe<ParticipantJoinedEvent>(
      'ParticipantJoined',
      (event) => this.handleParticipantJoined(event)
    );
    this.eventBus.subscribe<ParticipantLeftEvent>(
      'ParticipantLeft',
      (event) => this.handleParticipantLeft(event)
    );
  }

  async handlePostCreated(event: PostCreatedEvent): Promise<void> {
    const recipientIds = new Set<number>();

    let campaignName = 'Forum';
    if (event.campagneId) {
      const campaign = await this.campaignRepo.findById(event.campagneId);
      if (!campaign) return;
      campaignName = campaign.name;

      if (event.isPrivate === 1) {
        recipientIds.add(campaign.mjId);
        const canReadUsers = await this.forumRepo.getTopicCanReadUsers(event.topicId);
        for (const user of canReadUsers) {
          recipientIds.add(user.id);
        }
      } else {
        recipientIds.add(campaign.mjId);
        const participants = await this.campaignRepo.findCampaignParticipants(event.campagneId);
        for (const p of participants) {
          recipientIds.add(p.id);
        }
        const observers = await this.campaignRepo.findCampaignObservers(event.campagneId);
        for (const obs of observers) {
          recipientIds.add(obs.id);
        }
      }
    } else {
      if (event.isPrivate === 1) {
        const canReadUsers = await this.forumRepo.getTopicCanReadUsers(event.topicId);
        for (const user of canReadUsers) {
          recipientIds.add(user.id);
        }
      }
    }

    if (event.userId) {
      recipientIds.delete(event.userId);
    }

    const postUrl = `/forum/${event.campagneId || 0}/${event.topicId}/page/1#post${event.postId}`;

    for (const recipientId of recipientIds) {
      await this.notifUseCase.execute({
        userId: recipientId,
        title: `${campaignName} - Nouveau post`,
        content: `Nouveau message dans le sujet <a href="${postUrl}">${event.topicTitle}</a>`,
        url: postUrl,
        type: 'topic',
        targetId: event.topicId,
      });
    }
  }

  async handleRollCreated(event: RollCreatedEvent): Promise<void> {
    if (event.isTower) {
      const campaign = await this.campaignRepo.findById(event.campagneId);
      if (!campaign) return;

      if (campaign.mjId !== event.userId) {
        const towerUrl = `/campaigns/${event.campagneId}/dice`;
        await this.notifUseCase.execute({
          userId: campaign.mjId,
          title: `${campaign.name} - Jet de dé`,
          content: `Nouveau jet de dés dans <a href="${towerUrl}">la tour à dés</a> : ${event.formula} (${event.result})`,
          url: towerUrl,
          type: 'dice',
          targetId: event.campagneId,
        });
      }
      return;
    }

    if (event.topicId) {
      const recipientIds = new Set<number>();
      let campaignName = 'Forum';

      if (event.campagneId) {
        const campaign = await this.campaignRepo.findById(event.campagneId);
        if (!campaign) return;
        campaignName = campaign.name;

        if (event.isPrivate === 1) {
          recipientIds.add(campaign.mjId);
          const canReadUsers = await this.forumRepo.getTopicCanReadUsers(event.topicId);
          for (const user of canReadUsers) {
            recipientIds.add(user.id);
          }
        } else {
          recipientIds.add(campaign.mjId);
          const participants = await this.campaignRepo.findCampaignParticipants(event.campagneId);
          for (const p of participants) {
            recipientIds.add(p.id);
          }
          const observers = await this.campaignRepo.findCampaignObservers(event.campagneId);
          for (const obs of observers) {
            recipientIds.add(obs.id);
          }
        }
      } else {
        if (event.isPrivate === 1) {
          const canReadUsers = await this.forumRepo.getTopicCanReadUsers(event.topicId);
          for (const user of canReadUsers) {
            recipientIds.add(user.id);
          }
        }
      }

      if (event.userId) {
        recipientIds.delete(event.userId);
      }

      const topicTitle = event.topicTitle || 'Jet de dés';
      const topicUrl = event.postId
        ? `/forum/${event.campagneId || 0}/${event.topicId}/page/1#post${event.postId}`
        : `/forum/${event.campagneId || 0}/${event.topicId}/page/1`;

      for (const recipientId of recipientIds) {
        await this.notifUseCase.execute({
          userId: recipientId,
          title: `${campaignName} - Jet de dé`,
          content: `Nouveau jet de dé dans le sujet <a href="${topicUrl}">${topicTitle}</a>`,
          url: topicUrl,
          type: 'topic',
          targetId: event.topicId,
        });
      }
    }
  }

  async handleCharacterUpdated(event: CharacterUpdatedEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campagneId);
    if (!campaign) return;

    const recipientIds = new Set<number>();
    recipientIds.add(campaign.mjId);

    if (event.characterOwnerId) {
      recipientIds.add(event.characterOwnerId);
    }

    recipientIds.delete(event.modifierUserId);

    const charUrl = `/campaigns/${event.campagneId}/characters`;

    for (const recipientId of recipientIds) {
      await this.notifUseCase.execute({
        userId: recipientId,
        title: `${campaign.name} - Modification de personnage`,
        content: `Le personnage <a href="${charUrl}">${event.characterName}</a> a été mis à jour`,
        url: charUrl,
        type: 'perso',
        targetId: event.characterId,
      });
    }
  }

  async handleParticipantValidated(event: ParticipantValidatedEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campaignId);
    if (!campaign) return;

    const campaignUrl = `/campaigns/${event.campaignId}`;

    await this.notifUseCase.execute({
      userId: event.targetUserId,
      title: `${event.campaignName} - Inscription validée`,
      content: `Votre inscription à la campagne ${event.campaignName} a été validée`,
      url: campaignUrl,
      type: 'campaign',
      targetId: event.campaignId,
    });
  }

  async handleParticipantRejected(event: ParticipantRejectedEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campaignId);
    if (!campaign) return;

    const campaignUrl = `/campaigns/${event.campaignId}`;

    await this.notifUseCase.execute({
      userId: event.targetUserId,
      title: `${event.campaignName} - Inscription refusée`,
      content: `Votre inscription à la campagne ${event.campaignName} a été refusée`,
      url: campaignUrl,
      type: 'campaign',
      targetId: event.campaignId,
    });
  }

  async handleParticipantExcluded(event: ParticipantExcludedEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campaignId);
    if (!campaign) return;

    const campaignUrl = `/campaigns/${event.campaignId}`;

    await this.notifUseCase.execute({
      userId: event.targetUserId,
      title: `${event.campaignName} - Exclusion de la campagne`,
      content: `Vous avez été exclu de la campagne ${event.campaignName}`,
      url: campaignUrl,
      type: 'campaign',
      targetId: event.campaignId,
    });
  }

  async handleParticipantJoined(event: ParticipantJoinedEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campaignId);
    if (!campaign) return;

    const campaignUrl = `/campaigns/${event.campaignId}`;

    // Notify MJ about new pending registration
    await this.notifUseCase.execute({
      userId: campaign.mjId,
      title: `${event.campaignName} - Nouvelle inscription en attente`,
      content: `${event.targetUsername} souhaite rejoindre votre campagne ${event.campaignName}. Son inscription est en attente de validation.`,
      url: campaignUrl,
      type: 'campaign',
      targetId: event.campaignId,
    });
  }

  async handleParticipantLeft(event: ParticipantLeftEvent): Promise<void> {
    const campaign = await this.campaignRepo.findById(event.campaignId);
    if (!campaign) return;

    const campaignUrl = `/campaigns/${event.campaignId}`;

    // Notify MJ that a player left
    await this.notifUseCase.execute({
      userId: campaign.mjId,
      title: `${event.campaignName} - Un joueur a quitté la campagne`,
      content: `${event.targetUsername} a quitté votre campagne ${event.campaignName}`,
      url: campaignUrl,
      type: 'campaign',
      targetId: event.campaignId,
    });
  }
}

export const notificationListener = new NotificationListener();
