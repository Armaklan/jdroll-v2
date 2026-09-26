export interface Absence {
  id: number;
  userId: number;
  beginDate: string;
  endDate: string;
  commentaire: string | null;
}

export interface CampaignPlayerAbsence extends Absence {
  username: string;
  isMj: boolean;
}

export interface DeclareAbsencePayload {
  beginDate: string;
  endDate: string;
  commentaire: string;
}
