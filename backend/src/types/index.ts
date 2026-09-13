export interface User {
  id: number;
  username: string;
  mail: string;
  avatar: string;
  description: string;
  profil: number;
  titre: string;
  subscribe_date: string;
  birthDate?: string | null;
}

export interface UserWithPassword extends User {
  password?: string;
}

export interface CreateUserData {
  username: string;
  mail: string;
  passwordHash: string;
  avatar?: string;
  description?: string;
  profil?: number;
  titre?: string;
}

export interface JWTPayload {
  id: number;
  username: string;
  mail: string;
  profil: number;
}

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

export interface MyCampaignsFilter {
  role: CampaignRole;
  includeArchived: boolean;
}
