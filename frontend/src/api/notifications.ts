import { getToken } from './auth';
import { NotificationsResponse } from '../types/notification';

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

export const notificationsApi = {
  async getNotifications(): Promise<NotificationsResponse> {
    return request<NotificationsResponse>('/api/notifications');
  },

  async deleteNotification(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteAllNotifications(): Promise<{ success: boolean; count: number }> {
    return request<{ success: boolean; count: number }>('/api/notifications', {
      method: 'DELETE',
    });
  },
};
