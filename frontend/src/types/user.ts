import { Absence } from './absence';

export interface ProfileCampaign {
  id: number;
  name: string;
  isArchived: boolean;
}

export interface MemberSummary {
  id: number;
  username: string;
  avatar: string;
  profil: number;
  titre: string;
  subscribeDate: string | null;
  lastActionDate: string | null;
}

export interface PublicUserProfile {
  id: number;
  username: string;
  avatar: string;
  description: string;
  titre: string;
  profil: number;
  subscribeDate: string | null;
  birthDate?: string | null;
  currentAbsences: Absence[];
  masteredCampaigns: ProfileCampaign[];
  playedCampaigns: ProfileCampaign[];
}
