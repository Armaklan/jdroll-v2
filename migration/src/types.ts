export interface SourceCampaign {
  id: number;
  nom: string;
  jeuNom: string;
  annonce: string | null;
  statutCampagneId: number;
  inscriptionPJ: boolean;
  nbMaxJoueur: number;
}

export interface SourceEspace {
  id: number;
  campagneId: number;
  libelle: string;
  type: number;
  ordre: number;
}

export interface SourceSection {
  id: number;
  espaceId: number;
  libelle: string;
  ordre: number;
}

export interface SourceGroupe {
  id: number;
  campagneId: number;
  titre: string;
  espaceId: number | null;
  sectionId: number | null;
  statutGroupeId: number;
  ordre: number;
}

export interface SourceTheme {
  id: number;
  groupeId: number;
  titre: string;
  statutThemeId: number;
  ordre: number;
}

export interface SourcePost {
  id: number;
  themeId: number;
  contenu: string;
  dateCreation: string;
}

export interface NewCampaignData {
  mjId: number;
  name: string;
  systeme: string;
  univers: string;
  description: string;
  nbJoueurs: number;
  statut: number;
  isRecrutementOpen: boolean;
}

export interface NewSectionData {
  campagneId: number;
  title: string;
  ordre: number;
}

export interface NewTopicData {
  sectionId: number;
  title: string;
  isClosed: boolean;
  ordre: number;
}

export interface NewPostData {
  sourceId: number;
  userId: number;
  content: string;
  createDate: string;
}

export interface MigrationReport {
  sourceCampaignId: number;
  targetCampaignId: number;
  ownerUserId: number;
  sections: number;
  topics: number;
  posts: number;
  skippedPosts: number;
}
