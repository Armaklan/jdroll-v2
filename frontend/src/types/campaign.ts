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
  campagneId: number | null;
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

export interface GeneralForumData {
  sections: ForumSectionSummary[];
}

export interface ForumPostUser {
  id: number;
  username: string;
  avatar: string;
  profil: number;
  titre?: string;
}

export interface ForumPostPerso {
  id: number;
  name: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
}

export interface ForumPost {
  id: number;
  topicId: number;
  content: string;
  createDate: string;
  editor: number;
  user: ForumPostUser;
  perso?: ForumPostPerso | null;
  isRead: boolean;
}

export interface CharacterSummary {
  id: number;
  name: string;
  concept?: string;
  avatar?: string;
  userId?: number | null;
  campagneId: number;
}

export interface TopicDetail {
  id: number;
  sectionId: number;
  sectionTitle: string;
  campagneId: number | null;
  campaignTitle: string;
  title: string;
  stickable: boolean;
  isPrivate: boolean;
  isClosed: boolean;
  ordre: number;
  totalPosts: number;
  page: number;
  totalPages: number;
  pageSize: number;
  lastReadPostId: number | null;
  canPost: boolean;
  userRole?: 'mj' | 'player' | 'user' | null;
  availableCharacters: CharacterSummary[];
  posts: ForumPost[];
}
