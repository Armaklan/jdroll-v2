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

export type DomainEvent = PostCreatedEvent | RollCreatedEvent | CharacterUpdatedEvent;
