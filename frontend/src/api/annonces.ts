import { Annonce } from '../types/annonce';
import { getToken } from './auth';

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

export const annoncesApi = {
  async getVisibleAnnonces(): Promise<{ annonces: Annonce[] }> {
    return request<{ annonces: Annonce[] }>(`/api/annonces/visible?_=${Date.now()}`);
  },

  async getAnnonces(): Promise<{ annonces: Annonce[] }> {
    return request<{ annonces: Annonce[] }>(`/api/annonces?_=${Date.now()}`);
  },

  async createAnnonce(title: string, content: string, endDate: string): Promise<{ annonce: Annonce }> {
    return request<{ annonce: Annonce }>(`/api/annonces`, {
      method: 'POST',
      body: JSON.stringify({ title, content, endDate }),
    });
  },

  async updateAnnonce(id: number, title: string, content: string, endDate: string): Promise<{ annonce: Annonce }> {
    return request<{ annonce: Annonce }>(`/api/annonces/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, endDate }),
    });
  },

  async deleteAnnonce(id: number): Promise<void> {
    return request<void>(`/api/annonces/${id}`, {
      method: 'DELETE',
    });
  },
};
