import { FeatureFlip } from '../types/feature';
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

export const featuresApi = {
  async getFeatures(): Promise<{ features: FeatureFlip[] }> {
    // Les feature flips doivent toujours refléter l'état courant du serveur :
    // on contourne le cache HTTP (sinon une bascule récente peut être ignorée).
    return request<{ features: FeatureFlip[] }>(`/api/features?_=${Date.now()}`);
  },

  async setFeatureEnabled(name: string, enabled: boolean): Promise<{ feature: FeatureFlip }> {
    return request<{ feature: FeatureFlip }>(`/api/features/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },
};
