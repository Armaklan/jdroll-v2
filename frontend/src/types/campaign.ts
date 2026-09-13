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
