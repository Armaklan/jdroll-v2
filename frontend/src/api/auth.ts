import { User, AuthResponse, UpdateProfileData, NotificationSettings } from '../types/auth';

const TOKEN_KEY = 'jdroll_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

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

export const authApi = {
  async register(data: { username: string; mail: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { username: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    return request<{ status: string; service: string }>('/api/health');
  },

  async updateProfile(data: UpdateProfileData): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateNotificationSettings(data: NotificationSettings): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updatePassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
