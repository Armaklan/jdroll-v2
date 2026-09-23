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
  CampaignNotesData,
  Note,
  CarteSummary,
  CarteDetail,
  CreateCartePayload,
  UpdateCartePayload,
  CampaignSearchResults,
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

  async getAllCampaigns(includeArchived: boolean = false, search?: string, includePreparation: boolean = false): Promise<CampaignSummary[]> {
    const params = new URLSearchParams({
      includeArchived: String(includeArchived),
      includePreparation: String(includePreparation),
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

  async leaveCampaign(campaignId: number): Promise<{ success: boolean; message: string; campaignId: number }> {
    return request<{ success: boolean; message: string; campaignId: number }>(`/api/campaigns/${campaignId}/leave`, {
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

  async markAllGeneralForumTopicsAsRead(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/forum/mark-all-as-read', {
      method: 'POST',
    });
  },

  async markAllCampaignForumTopicsAsRead(campaignId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/campaigns/${campaignId}/forum/mark-all-as-read`, {
      method: 'POST',
    });
  },

  async getCampaignCharacters(campaignId: number): Promise<CampaignCharactersData> {
    return request<CampaignCharactersData>(`/api/campaigns/${campaignId}/characters`);
  },

  async getCharacter(characterId: number, campaignId?: number): Promise<{ campaign: CampaignSummary; character: CampaignCharacter }> {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/characters/${characterId}` : `/api/characters/${characterId}`;
    return request<{ campaign: CampaignSummary; character: CampaignCharacter }>(endpoint);
  },

  async getCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    const result = await request<{ participants: CampaignParticipant[] }>(`/api/campaigns/${campaignId}/participants`);
    return result.participants;
  },

  async getPendingParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    const result = await request<{ pendingParticipants: CampaignParticipant[] }>(`/api/campaigns/${campaignId}/pending-participants`);
    return result.pendingParticipants;
  },

  async acceptParticipant(campaignId: number, userId: number): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/campaigns/${campaignId}/participants/${userId}/accept`, {
      method: 'POST',
    });
  },

  async rejectParticipant(campaignId: number, userId: number): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/campaigns/${campaignId}/participants/${userId}/reject`, {
      method: 'POST',
    });
  },

  async excludeParticipant(campaignId: number, userId: number): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/campaigns/${campaignId}/participants/${userId}/exclude`, {
      method: 'POST',
    });
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

  async deleteCharacter(characterId: number, campaignId?: number): Promise<{ success: boolean; characterId: number }> {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/characters/${characterId}` : `/api/characters/${characterId}`;
    return request<{ success: boolean; characterId: number }>(endpoint, {
      method: 'DELETE',
    });
  },

  async createCategory(campaignId: number, data: { name: string; defaultCollapse?: boolean }): Promise<{ category: { id: number; campagneId: number; name: string; defaultCollapse: boolean } }> {
    return request<{ category: { id: number; campagneId: number; name: string; defaultCollapse: boolean } }>(`/api/campaigns/${campaignId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(categoryId: number, data: { name?: string; defaultCollapse?: boolean }, campaignId?: number): Promise<{ category: { id: number; campagneId: number; name: string; defaultCollapse: boolean } }> {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/categories/${categoryId}` : `/api/categories/${categoryId}`;
    return request<{ category: { id: number; campagneId: number; name: string; defaultCollapse: boolean } }>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(categoryId: number, campaignId?: number): Promise<{ success: boolean; categoryId: number }> {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/categories/${categoryId}` : `/api/categories/${categoryId}`;
    return request<{ success: boolean; categoryId: number }>(endpoint, {
      method: 'DELETE',
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
    const url = page !== undefined ? `/api/topics/${topicId}?page=${page}` : `/api/topics/${topicId}`;
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

  async saveDraft(topicId: number, content: string, persoId?: number | null) {
    return request<{ draft: any }>(`/api/topics/${topicId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({
        content,
        persoId: persoId ?? null,
      }),
    });
  },

  async deleteDraft(topicId: number) {
    return request<{ success: boolean }>(`/api/topics/${topicId}/draft`, {
      method: 'DELETE',
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
    const endpoint = campaignId && campaignId > 0 ? `/api/campaigns/${campaignId}/sections` : `/api/sections`;
    return request<{ section: any }>(endpoint, {
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

  async deleteSection(sectionId: number, campaignId?: number) {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/sections/${sectionId}` : `/api/sections/${sectionId}`;
    return request<{ success: boolean; sectionId: number }>(endpoint, {
      method: 'DELETE',
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

  async deleteTopic(topicId: number, campaignId?: number) {
    const endpoint = campaignId ? `/api/campaigns/${campaignId}/topics/${topicId}` : `/api/topics/${topicId}`;
    return request<{ success: boolean; topicId: number }>(endpoint, {
      method: 'DELETE',
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

  async getCampaignNotes(campaignId: number): Promise<CampaignNotesData> {
    return request<CampaignNotesData>(`/api/campaigns/${campaignId}/notes`);
  },

  async createCampaignNote(campaignId: number, content?: string): Promise<{ note: Note }> {
    return request<{ note: Note }>(`/api/campaigns/${campaignId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content: content ?? '' }),
    });
  },

  async updateCampaignNote(campaignId: number, noteId: number, content: string): Promise<{ note: Note }> {
    return request<{ note: Note }>(`/api/campaigns/${campaignId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  async deleteCampaignNote(campaignId: number, noteId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/campaigns/${campaignId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  async getCampaignCartes(campaignId: number): Promise<CarteSummary[]> {
    return request<CarteSummary[]>(`/api/campaigns/${campaignId}/cartes`);
  },

  async getCarte(campaignId: number, carteId: number): Promise<CarteDetail> {
    return request<CarteDetail>(`/api/campaigns/${campaignId}/cartes/${carteId}`);
  },

  async createCarte(campaignId: number, data: CreateCartePayload): Promise<{ id: number }> {
    return request<{ id: number }>(`/api/campaigns/${campaignId}/cartes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCarte(campaignId: number, carteId: number, data: UpdateCartePayload): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/campaigns/${campaignId}/cartes/${carteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCarte(campaignId: number, carteId: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/campaigns/${campaignId}/cartes/${carteId}`, {
      method: 'DELETE',
    });
  },

  async uploadCarteImage(campaignId: number, file: File): Promise<{ url: string }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/campaigns/${campaignId}/cartes/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Erreur lors du téléversement (${response.status})`);
    }

    return data as { url: string };
  },

  async searchCampaign(campaignId: number, query: string = ''): Promise<CampaignSearchResults> {
    const params = new URLSearchParams();
    if (query && query.trim()) {
      params.set('q', query.trim());
    }
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return request<CampaignSearchResults>(`/api/campaigns/${campaignId}/search${queryStr}`);
  },
};
