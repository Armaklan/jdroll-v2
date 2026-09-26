import { Absence } from './absence';

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
}
