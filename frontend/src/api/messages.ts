import { getToken } from './auth';
import {
  InboxMessageSummary,
  SentMessageSummary,
  MessageDetail,
  SendMessagePayload,
  UserSearchResult,
} from '../types/message';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erreur requête (${response.status})`);
  }

  return data as T;
}

export const messagesApi = {
  async getInbox(): Promise<{ messages: InboxMessageSummary[]; unreadCount: number }> {
    return request<{ messages: InboxMessageSummary[]; unreadCount: number }>('/api/messages/inbox');
  },

  async getSent(): Promise<{ messages: SentMessageSummary[] }> {
    return request<{ messages: SentMessageSummary[] }>('/api/messages/sent');
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return request<{ unreadCount: number }>('/api/messages/unread-count');
  },

  async searchUsers(query: string): Promise<{ users: UserSearchResult[] }> {
    const params = new URLSearchParams();
    if (query) {
      params.append('q', query);
    }
    return request<{ users: UserSearchResult[] }>(`/api/messages/users?${params.toString()}`);
  },

  async getMessageDetail(id: number): Promise<{ message: MessageDetail }> {
    return request<{ message: MessageDetail }>(`/api/messages/${id}`);
  },

  async sendMessage(payload: SendMessagePayload): Promise<{ success: boolean; messageId: number }> {
    return request<{ success: boolean; messageId: number }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteFromInbox(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/messages/inbox/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteFromSent(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/messages/sent/${id}`, {
      method: 'DELETE',
    });
  },
};
