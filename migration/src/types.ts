export interface SourceCampaign {
  id: number;
  nom: string;
  jeuNom: string;
  annonce: string | null;
  statutCampagneId: number;
  inscriptionPJ: boolean;
  nbMaxJoueur: number;
}

/**
 * Habillage espritjdr (table `habillage`) d'une campagne : le bandeau est
 * importé comme bannière de la campagne jdroll (campagne.banniere et
 * campagne_config.banniere).
 */
export interface SourceHabillage {
  campagneId: number;
  bandeau: string | null;
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
  utilisateurId: number | null;
  utilisateurPseudo: string | null;
}

/**
 * Intervenant non importé comme personnage : CREA (type 1) ou MJ (type 2).
 * Le pseudo de l'utilisateur espritjdr lié permet le rapprochement avec un
 * utilisateur jdroll de même pseudo.
 */
export interface SourceMjIntervenant {
  id: number;
  typeIntervenantId: number;
  utilisateurId: number | null;
  utilisateurPseudo: string | null;
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

/**
 * Demande de jet de dés espritjdr (demande_jet). Les champs Jet1..Jet10
 * contiennent chacun une ligne de jet au format pipe :
 * <id fiche>|<secret>|<type de dé>|<compétence>|<valeur>|...
 * Les jets génériques (id fiche = 0) portent le nombre de dés.
 * etat : 1 = demandé, 3 = réalisé (resultat rempli avec le rendu historique).
 * postThemeId : post du thème auquel la demande est rattachée.
 */
export interface SourceDiceRequest {
  id: number;
  intervenantFromId: number;
  intervenantToId: number;
  typeJet: string;
  jetSecret: boolean;
  nom: string;
  jets: string[];
  etat: number;
  nbjet: number;
  title: string;
  resultat: string | null;
  campagneId: number | null;
  postThemeId: number | null;
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
  /** Clé de mapping espritjdr_migration : 'post:<id>' ou 'demande_jet_post:<id>'. */
  mappingKey: string;
  userId: number | null;
  persoId: number | null;
  content: string;
  createDate: string;
}

/** Ligne de la table dicer issue d'une demande de jet espritjdr. */
export interface NewDiceRollData {
  sourceId: number;
  userId: number;
  campagneId: number;
  createDate: string | null;
  result: string;
  description: string;
}

/**
 * Fiche du générateur espritjdr (table `generateur_fiche`) : contenu XML de la
 * fiche telle que conçue par l'utilisateur.
 */
export interface SourceFiche {
  id: number;
  nom: string;
  contenuXml: string;
}

/** Fiche codée jdroll appliquée à campagne_config lors d'une migration. */
export interface NewCampaignSheetData {
  /** Image de fond (campagne_config.template_img), url locale ou d'origine. */
  templateImg: string | null;
  /** HTML des champs (campagne_config.template_fields). */
  templateFields: string;
  /** Couleur du texte des champs (campagne_config.text_color). */
  textColor: string | null;
}

export interface SheetMigrationReport {
  sourceFicheId: number;
  ficheNom: string;
  /** Nombre de champs convertis dans la fiche codée. */
  fields: number;
  /** Fonctionnalités espritjdr sans équivalent jdroll (clé -> occurrences). */
  unsupported: Record<string, number>;
}

export interface MigrationReport {
  sourceCampaignId: number;
  targetCampaignId: number;
  /** Utilisateur technique auteur des posts et MJ par défaut de la campagne. */
  ownerUserId: number;
  /** MJ final de la campagne : utilisateur jdroll rattaché au CREA, sinon ownerUserId. */
  mjUserId: number;
  sections: number;
  topics: number;
  pnjs: number;
  images: number;
  posts: number;
  /** Lignes dicer créées depuis les demandes de jet espritjdr. */
  diceRolls: number;
  /** Posts de jet de dés créés (intercalés après le post lié). */
  dicePosts: number;
  hjPosts: number;
  skippedPosts: number;
  /** Utilisateurs jdroll rattachés à un intervenant importé (participant validé + perso). */
  participants: number;
  /** Utilisateurs jdroll rattachés à un intervenant MJ (type 2) ajoutés MJ assistants. */
  assistants: number;
  /** Fiche du générateur convertie en fiche codée, null si non demandé ou déjà appliquée. */
  sheet: SheetMigrationReport | null;
}
