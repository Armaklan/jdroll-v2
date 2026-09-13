import { CampaignSummary, CampaignRole, CampaignForumData, GeneralForumData, TopicDetail } from '../types/campaign';
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
};
