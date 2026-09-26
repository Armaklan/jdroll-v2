import { getToken } from './auth';
import { Absence, DeclareAbsencePayload } from '../types/absence';

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

export const absencesApi = {
  async getMyAbsences(): Promise<Absence[]> {
    const result = await request<{ absences: Absence[] }>('/api/absences');
    return result.absences;
  },

  async declareAbsence(payload: DeclareAbsencePayload): Promise<Absence> {
    const result = await request<{ absence: Absence }>('/api/absences', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result.absence;
  },

  async deleteAbsence(absenceId: number): Promise<void> {
    await request<{ success: boolean }>(`/api/absences/${absenceId}`, {
      method: 'DELETE',
    });
  },
};
