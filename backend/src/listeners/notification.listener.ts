import { IEventBus, domainEventBus } from '../events/event-bus.js';
import { PostCreatedEvent, RollCreatedEvent, CharacterUpdatedEvent } from '../events/events.js';
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
  }

  async handlePostCreated(event: PostCreatedEvent): Promise<void> {
    const recipientIds = new Set<number>();

    if (event.campagneId) {
      const campaign = await this.campaignRepo.findById(event.campagneId);
      if (!campaign) return;

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

    for (const recipientId of recipientIds) {
      await this.notifUseCase.execute({
        userId: recipientId,
        title: event.topicTitle,
        content: `Nouveau message dans le sujet "${event.topicTitle}"`,
        url: `/forum/${event.campagneId || 0}/${event.topicId}/page/1#post${event.postId}`,
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
        await this.notifUseCase.execute({
          userId: campaign.mjId,
          title: campaign.name,
          content: `Nouveau jet de dés dans la tour à dés : ${event.formula} (${event.result})`,
          url: `/campaigns/${event.campagneId}/dice`,
          type: 'dice',
          targetId: event.campagneId,
        });
      }
      return;
    }

    if (event.topicId) {
      const recipientIds = new Set<number>();

      if (event.campagneId) {
        const campaign = await this.campaignRepo.findById(event.campagneId);
        if (!campaign) return;

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
          title: topicTitle,
          content: `Nouveau jet de dé dans le sujet "${topicTitle}"`,
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

    for (const recipientId of recipientIds) {
      await this.notifUseCase.execute({
        userId: recipientId,
        title: event.characterName,
        content: `Le personnage "${event.characterName}" a été mis à jour`,
        url: `/campaigns/${event.campagneId}/characters`,
        type: 'perso',
        targetId: event.characterId,
      });
    }
  }
}

export const notificationListener = new NotificationListener();
