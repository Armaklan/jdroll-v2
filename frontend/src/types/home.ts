export interface HomeUserSummary {
  id: number;
  username: string;
  avatar: string;
  profil: number;
  subscribeDate?: string | null;
  birthDate?: string | null;
}

export interface HomeCommunityStats {
  latestRegistrations: HomeUserSummary[];
  todayBirthdays: HomeUserSummary[];
}
