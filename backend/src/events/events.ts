export interface PostCreatedEvent {
  name: 'PostCreated';
  postId: number;
  topicId: number;
  campagneId: number | null;
  userId: number | null;
  topicTitle: string;
  isPrivate: number;
}

export interface RollCreatedEvent {
  name: 'RollCreated';
  rollId: number;
  campagneId: number;
  userId: number;
  topicId?: number | null;
  postId?: number | null;
  topicTitle?: string | null;
  isPrivate?: number;
  isTower: boolean;
  formula: string;
  result: string;
  description?: string;
}

export interface CharacterUpdatedEvent {
  name: 'CharacterUpdated';
  characterId: number;
  campagneId: number;
  characterName: string;
  characterOwnerId: number | null;
  modifierUserId: number;
}

export interface ParticipantValidatedEvent {
  name: 'ParticipantValidated';
  campaignId: number;
  campaignName: string;
  mjId: number;
  targetUserId: number;
  targetUsername: string;
}

export interface ParticipantRejectedEvent {
  name: 'ParticipantRejected';
  campaignId: number;
  campaignName: string;
  mjId: number;
  targetUserId: number;
  targetUsername: string;
}

export interface ParticipantExcludedEvent {
  name: 'ParticipantExcluded';
  campaignId: number;
  campaignName: string;
  mjId: number;
  targetUserId: number;
  targetUsername: string;
}

export interface ParticipantJoinedEvent {
  name: 'ParticipantJoined';
  campaignId: number;
  campaignName: string;
  targetUserId: number;
  targetUsername: string;
}

export interface ParticipantLeftEvent {
  name: 'ParticipantLeft';
  campaignId: number;
  campaignName: string;
  targetUserId: number;
  targetUsername: string;
}

export type DomainEvent =
  | PostCreatedEvent
  | RollCreatedEvent
  | CharacterUpdatedEvent
  | ParticipantValidatedEvent
  | ParticipantRejectedEvent
  | ParticipantExcludedEvent
  | ParticipantJoinedEvent
  | ParticipantLeftEvent;
