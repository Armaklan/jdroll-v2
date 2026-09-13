export interface CampaignSummary {
  id: number;
  name: string;
  mjId: number;
  mjUsername: string;
  mjAvatar?: string;
  nbJoueurs: number;
  nbJoueursActuel: number;
  banniere: string;
  systeme: string;
  univers: string;
  description: string;
  statut: number;
  isArchived: boolean;
  isRecrutementOpen: boolean;
  rythme?: number;
  rp?: number;
  userRole?: 'mj' | 'player';
  characterName?: string | null;
  characterAvatar?: string | null;
}

export type CampaignRole = 'master' | 'player';

export interface ForumLastPost {
  id: number;
  createDate: string;
  userId: number;
  username: string;
  userAvatar?: string;
  persoId?: number | null;
}

export interface ForumTopicSummary {
  id: number;
  sectionId: number;
  title: string;
  stickable: boolean;
  isPrivate: boolean;
  isClosed: boolean;
  ordre: number;
  postsCount: number;
  lastPost?: ForumLastPost | null;
  isRead: boolean;
}

export interface ForumSectionSummary {
  id: number;
  campagneId: number;
  title: string;
  ordre: number;
  defaultCollapse: boolean;
  banniere?: string;
  topics: ForumTopicSummary[];
}

export interface CampaignForumData {
  campaign: CampaignSummary;
  sections: ForumSectionSummary[];
}
