export interface MessageRecipient {
  id: number;
  username: string;
  avatar?: string | null;
  statut: number; // 0 = unread, 1 = read, 2 = deleted
  isRead: boolean;
}

export interface InboxMessageSummary {
  id: number;
  fromId: number;
  fromUsername: string;
  fromAvatar?: string | null;
  title: string;
  time: string;
  statut: number;
  isRead: boolean;
  recipients?: MessageRecipient[];
}

export interface SentMessageSummary {
  id: number;
  fromId: number;
  fromUsername: string;
  title: string;
  time: string;
  statut: number;
  recipients: MessageRecipient[];
  isRead: boolean;
}

export interface MessageDetail {
  id: number;
  fromId: number;
  fromUsername: string;
  fromAvatar?: string | null;
  title: string;
  content: string;
  time: string;
  statut: number;
  recipients: MessageRecipient[];
  isSender: boolean;
  isRead: boolean;
}

export interface SendMessagePayload {
  title: string;
  content: string;
  recipients: string[];
}

export interface UserSearchResult {
  id: number;
  username: string;
  avatar?: string | null;
}
