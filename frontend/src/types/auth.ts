export interface User {
  id: number;
  username: string;
  mail: string;
  avatar: string;
  description: string;
  profil: number;
  titre: string;
  subscribe_date?: string;
  birthDate?: string | null;
  notif_mp?: number;
  notif_inscription?: number;
  notif_perso?: number;
  notif_message?: number;
  mail_mp?: number;
  mail_inscription?: number;
  mail_perso?: number;
  mail_message?: number;
}

export interface UpdateProfileData {
  mail?: string;
  avatar?: string;
  description?: string;
  titre?: string;
  birthDate?: string | null;
}

export interface NotificationSettings {
  notif_mp?: number;
  notif_inscription?: number;
  notif_perso?: number;
  notif_message?: number;
  mail_mp?: number;
  mail_inscription?: number;
  mail_perso?: number;
  mail_message?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
