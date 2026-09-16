export interface ChatMessage {
  id: number;
  username: string;
  userAvatar?: string | null;
  userProfil?: number;
  time: string;
  message: string;
  to: string;
  to_username: string;
}

export interface ChatConnectedUser {
  id: number;
  username: string;
  avatar?: string;
  profil?: number;
}

export interface ChatUserSearchResult {
  id: number;
  username: string;
  avatar: string;
}

export interface SendChatMessagePayload {
  message: string;
  to?: string;
  to_username?: string;
}

export type ChatActiveChannel =
  | { type: 'general' }
  | { type: 'private'; user: { id?: number; username: string; avatar?: string; profil?: number } };
