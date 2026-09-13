import {
  CampaignSummary,
  CampaignRole,
  CampaignForumData,
  GeneralForumData,
  TopicDetail,
  CampaignCharactersData,
  CampaignParticipant,
  CreateCharacterPayload,
  UpdateCharacterPayload,
  CampaignCharacter,
} from '../types/campaign';
import { getToken } from './auth';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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

export const campaignsApi = {
  async getGeneralForum(): Promise<GeneralForumData> {
    return request<GeneralForumData>('/api/forum');
  },

  async getMyCampaigns(role: CampaignRole = 'master', includeArchived: boolean = false): Promise<CampaignSummary[]> {
    const params = new URLSearchParams({
      role,
      includeArchived: String(includeArchived),
    });

    const result = await request<{ campaigns: CampaignSummary[] }>(`/api/campaigns/mine?${params.toString()}`);
    return result.campaigns;
  },

  async getAllCampaigns(includeArchived: boolean = false, search?: string): Promise<CampaignSummary[]> {
    const params = new URLSearchParams({
      includeArchived: String(includeArchived),
    });
    if (search && search.trim()) {
      params.set('search', search.trim());
    }

    const result = await request<{ campaigns: CampaignSummary[] }>(`/api/campaigns?${params.toString()}`);
    return result.campaigns;
  },

  async getCampaignForum(campaignId: number): Promise<CampaignForumData> {
    return request<CampaignForumData>(`/api/campaigns/${campaignId}/forum`);
  },

  async getCampaignCharacters(campaignId: number): Promise<CampaignCharactersData> {
    return request<CampaignCharactersData>(`/api/campaigns/${campaignId}/characters`);
  },

  async getCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    const result = await request<{ participants: CampaignParticipant[] }>(`/api/campaigns/${campaignId}/participants`);
    return result.participants;
  },

  async createCharacter(campaignId: number, payload: CreateCharacterPayload): Promise<CampaignCharacter> {
    return request<CampaignCharacter>(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCharacter(characterId: number, payload: UpdateCharacterPayload, campaignId?: number): Promise<CampaignCharacter> {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/characters/${characterId}` : `/api/characters/${characterId}`;
    return request<CampaignCharacter>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async uploadCampaignImage(campaignId: number, file: File): Promise<{ url: string; filename: string }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/campaigns/${campaignId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Erreur lors du téléversement (${response.status})`);
    }

    return data as { url: string; filename: string };
  },

  async uploadCharacterAvatar(campaignId: number, file: File): Promise<{ url: string; filename: string }> {
    return this.uploadCampaignImage(campaignId, file);
  },

  async getTopicPosts(topicId: number, page?: number): Promise<TopicDetail> {
    const url = page ? `/api/topics/${topicId}?page=${page}` : `/api/topics/${topicId}`;
    return request<TopicDetail>(url);
  },

  async createPost(topicId: number, content: string, persoId?: number | null) {
    return request<{ post: any }>(`/api/topics/${topicId}/posts`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        persoId: persoId ?? null,
      }),
    });
  },

  async createSection(campaignId: number, data: { title: string; defaultCollapse?: boolean; banniere?: string }) {
    return request<{ section: any }>(`/api/campaigns/${campaignId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createTopic(sectionId: number, data: {
    title: string;
    stickable?: boolean;
    isPrivate?: boolean;
    isClosed?: boolean;
    firstPostContent?: string;
    persoId?: number | null;
  }) {
    return request<{ topic: any }>(`/api/sections/${sectionId}/topics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async reorderSections(campaignId: number, sectionIds: number[]) {
    return request<{ success: boolean; sectionIds: number[] }>(`/api/campaigns/${campaignId}/sections/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ sectionIds }),
    });
  },

  async reorderTopics(campaignId: number, sections: Array<{ sectionId: number; topicIds: number[] }>) {
    return request<{ success: boolean }>(`/api/campaigns/${campaignId}/topics/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ sections }),
    });
  },
};
