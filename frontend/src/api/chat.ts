import { getToken } from './auth';
import {
  ChatMessage,
  ChatConnectedUser,
  ChatUserSearchResult,
  SendChatMessagePayload,
} from '../types/chat';

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

export const chatApi = {
  async getRecentMessages(limit = 200): Promise<{ messages: ChatMessage[] }> {
    return request<{ messages: ChatMessage[] }>(`/api/chat/messages?limit=${limit}`);
  },

  async sendMessage(payload: SendChatMessagePayload): Promise<{ message: ChatMessage }> {
    return request<{ message: ChatMessage }>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getOnlineUsers(): Promise<{ users: ChatConnectedUser[] }> {
    return request<{ users: ChatConnectedUser[] }>('/api/chat/users/online');
  },

  async searchUsers(query: string): Promise<{ users: ChatUserSearchResult[] }> {
    const params = new URLSearchParams();
    if (query) {
      params.append('q', query);
    }
    return request<{ users: ChatUserSearchResult[] }>(`/api/chat/users/search?${params.toString()}`);
  },

  getWebSocketUrl(): string {
    const token = getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/chat/ws?token=${encodeURIComponent(token || '')}`;
  },
};
