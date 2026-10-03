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

export interface SourceIntervenant {
  id: number;
  nom: string;
  descriptionPublique: string | null;
  descriptionPrivee: string | null;
  image: string | null;
}

export interface SourcePost {
  id: number;
  themeId: number;
  intervenantId: number;
  contenu: string;
  dateCreation: string;
}

export interface SourceHjPostResponse {
  id: number;
  hjPostId: number;
  intervenantId: number;
  intervenantNom: string;
  contenu: string;
  dateCreation: string;
}

export interface SourceHjPost {
  id: number;
  postThemeId: number;
  intervenantFromId: number;
  intervenantFromNom: string;
  contenu: string;
  dateCreation: string;
  reponses: SourceHjPostResponse[];
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

export interface NewPnjData {
  campagneId: number;
  name: string;
  avatar: string;
  publicDescription: string;
  privateDescription: string;
}

export interface NewPostData {
  sourceId: number;
  userId: number;
  persoId: number | null;
  content: string;
  createDate: string;
}

export interface MigrationReport {
  sourceCampaignId: number;
  targetCampaignId: number;
  ownerUserId: number;
  sections: number;
  topics: number;
  pnjs: number;
  images: number;
  posts: number;
  hjPosts: number;
  skippedPosts: number;
}
