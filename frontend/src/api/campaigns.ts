import {
  CampaignSummary,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  CampaignRole,
  CampaignForumData,
  GeneralForumData,
  TopicDetail,
  CampaignCharactersData,
  CampaignParticipant,
  CreateCharacterPayload,
  UpdateCharacterPayload,
  CampaignCharacter,
  CampaignDiceRoll,
} from '../types/campaign';
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

export const campaignsApi = {
  async getGeneralForum(): Promise<GeneralForumData> {
    return request<GeneralForumData>('/api/forum');
  },

  async getMyCampaigns(role: CampaignRole = 'all', includeArchived: boolean = false): Promise<CampaignSummary[]> {
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

  async getCampaign(campaignId: number): Promise<CampaignSummary> {
    const result = await request<{ campaign: CampaignSummary }>(`/api/campaigns/${campaignId}`);
    return result.campaign;
  },

  async joinCampaign(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number }> {
    return request<{ success: boolean; message: string; campaignId: number }>(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
    });
  },

  async observeCampaign(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number; isObserving: boolean }> {
    return request<{ success: boolean; message: string; campaignId: number; isObserving: boolean }>(`/api/campaigns/${campaignId}/observe`, {
      method: 'POST',
    });
  },

  async unobserveCampaign(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number; isObserving: boolean }> {
    return request<{ success: boolean; message: string; campaignId: number; isObserving: boolean }>(`/api/campaigns/${campaignId}/observe`, {
      method: 'DELETE',
    });
  },

  async toggleObserveCampaign(campaignId: number, currentlyObserving: boolean): Promise<{ success: boolean; message: string; campaignId: number; isObserving: boolean }> {
    if (currentlyObserving) {
      return this.unobserveCampaign(campaignId);
    }
    return this.observeCampaign(campaignId);
  },

  async setCampaignAlert(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number; hasAlert: boolean }> {
    return request<{ success: boolean; message: string; campaignId: number; hasAlert: boolean }>(`/api/campaigns/${campaignId}/alert`, {
      method: 'POST',
    });
  },

  async removeCampaignAlert(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number; hasAlert: boolean }> {
    return request<{ success: boolean; message: string; campaignId: number; hasAlert: boolean }>(`/api/campaigns/${campaignId}/alert`, {
      method: 'DELETE',
    });
  },

  async toggleCampaignAlert(campaignId: number, currentlyHasAlert: boolean): Promise<{ success: boolean; message: string; campaignId: number; hasAlert: boolean }> {
    if (currentlyHasAlert) {
      return this.removeCampaignAlert(campaignId);
    }
    return this.setCampaignAlert(campaignId);
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<CampaignSummary> {
    const result = await request<{ campaign: CampaignSummary }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return result.campaign;
  },

  async updateCampaign(campaignId: number, payload: UpdateCampaignPayload): Promise<CampaignSummary> {
    const result = await request<{ campaign: CampaignSummary }>(`/api/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return result.campaign;
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

  async uploadCampaignBanner(campaignId: number, file: File): Promise<{ url: string; filename: string }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/campaigns/${campaignId}/banner`, {
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

  async updatePost(postId: number, data: { content: string; persoId?: number | null }) {
    return request<{ post: any }>(`/api/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePost(postId: number) {
    return request<{ success: boolean; topicId: number; deletedPostId: number; newLastPostId: number | null }>(`/api/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  async rollDice(topicId: number, data: { formula: string; description?: string }) {
    return request<{ post: any; rollId: number; evaluation: any }>(`/api/topics/${topicId}/dice-roll`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCampaignDiceRolls(campaignId: number): Promise<CampaignDiceRoll[]> {
    const result = await request<{ rolls: CampaignDiceRoll[] }>(`/api/campaigns/${campaignId}/dice-rolls`);
    return result.rolls;
  },

  async rollCampaignDice(
    campaignId: number,
    data: { formula: string; description?: string }
  ): Promise<{ roll: CampaignDiceRoll; evaluation: any }> {
    return request<{ roll: CampaignDiceRoll; evaluation: any }>(`/api/campaigns/${campaignId}/dice-rolls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createSection(campaignId: number, data: { title: string; defaultCollapse?: boolean; banniere?: string }) {
    return request<{ section: any }>(`/api/campaigns/${campaignId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSection(sectionId: number, data: { title?: string; defaultCollapse?: boolean; banniere?: string }, campaignId?: number) {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/sections/${sectionId}` : `/api/sections/${sectionId}`;
    return request<{ section: any }>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async uploadSectionBanner(sectionId: number, file: File, campaignId?: number): Promise<{ url: string; filename: string; sectionId: number }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const endpoint = campaignId ? `/api/campaigns/${campaignId}/sections/${sectionId}/banner` : `/api/sections/${sectionId}/banner`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Erreur lors du téléversement (${response.status})`);
    }

    return data as { url: string; filename: string; sectionId: number };
  },

  async createTopic(sectionId: number, data: {
    title: string;
    stickable?: boolean;
    isPrivate?: number | boolean;
    canReadUserIds?: number[];
    isClosed?: boolean;
    firstPostContent?: string;
    persoId?: number | null;
  }) {
    return request<{ topic: any }>(`/api/sections/${sectionId}/topics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTopic(topicId: number, data: {
    title?: string;
    stickable?: boolean;
    isPrivate?: number | boolean;
    canReadUserIds?: number[];
    isClosed?: boolean;
  }, campaignId?: number) {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/topics/${topicId}` : `/api/topics/${topicId}`;
    return request<{ topic: any }>(endpoint, {
      method: 'PUT',
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
