export interface User {
  id: number;
  username: string;
  mail: string;
  avatar: string;
  description: string;
  profil: number;
  titre: string;
  subscribe_date?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
