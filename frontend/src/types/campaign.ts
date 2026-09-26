import type { CampaignPlayerAbsence } from './absence';

export interface CampaignSummary {
  id: number;
  name: string;
  mjId: number;
  mjUsername: string;
  mjAvatar?: string;
  mjProfil?: number;
  nbJoueurs: number;
  nbJoueursActuel: number;
  banniere: string;
  banniereForum?: string | null;
  systeme: string;
  univers: string;
  description: string;
  statut: number;
  isArchived: boolean;
  isRecrutementOpen: boolean;
  rythme?: number;
  rp?: number;
  isMultiCharacter?: boolean;
  userRole?: 'mj' | 'player' | 'observer';
  isObserving?: boolean;
  isPending?: boolean;
  characterName?: string | null;
  characterAvatar?: string | null;
  dialogueColor?: string | null;
  penseeColor?: string | null;
  rp1Color?: string | null;
  rp2Color?: string | null;
  quoteColor?: string | null;
  sidebarColor?: string | null;
  oddLineColor?: string | null;
  evenLineColor?: string | null;
  textColor?: string | null;
  linkColor?: string | null;
  linkSidebarColor?: string | null;
  hr?: string | null;
  width?: string | null;
  defaultDice?: string | null;
  defaultPersoId?: number | null;
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
  widgets?: string | null;
  hasUnread?: boolean;
  hasAlert?: boolean;
}

export interface CreateCampaignPayload {
  name: string;
  systeme?: string;
  univers?: string;
  description?: string;
  nbJoueurs?: number;
  banniere?: string;
  banniereForum?: string | null;
  statut?: number;
  isRecrutementOpen?: boolean;
  rythme?: number;
  rp?: number;
  isMultiCharacter?: boolean;
  dialogueColor?: string | null;
  penseeColor?: string | null;
  rp1Color?: string | null;
  rp2Color?: string | null;
  quoteColor?: string | null;
  sidebarColor?: string | null;
  oddLineColor?: string | null;
  evenLineColor?: string | null;
  textColor?: string | null;
  linkColor?: string | null;
  linkSidebarColor?: string | null;
  hr?: string | null;
  width?: string | null;
  defaultDice?: string | null;
  defaultPersoId?: number | null;
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
  widgets?: string | null;
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload>;

export type CampaignWidgetType = 'token' | 'jauge' | 'text';

export interface CampaignWidget {
  id: string;
  name: string;
  type: CampaignWidgetType;
  low?: number | string;
  up?: number | string;
  value?: number | string;
}

export type CampaignRole = 'all' | 'master' | 'player' | 'observer';

export interface ForumLastPost {
  id: number;
  createDate: string;
  userId: number;
  username: string;
  userAvatar?: string;
  userProfil?: number;
  persoId?: number | null;
}

export interface TopicUserSummary {
  id: number;
  username: string;
  avatar?: string;
}

export interface ForumTopicSummary {
  id: number;
  sectionId: number;
  title: string;
  stickable: boolean;
  isPrivate: number | boolean;
  isClosed: boolean;
  ordre: number;
  postsCount: number;
  lastPost?: ForumLastPost | null;
  isRead: boolean;
  canReadUsers?: TopicUserSummary[];
}

export interface ForumSectionSummary {
  id: number;
  campagneId: number | null;
  title: string;
  ordre: number;
  defaultCollapse: boolean;
  banniere?: string;
  topics: ForumTopicSummary[];
}

export interface CampaignForumData {
  campaign: CampaignSummary;
  sections: ForumSectionSummary[];
  pendingParticipants?: CampaignParticipant[];
  currentAbsences?: CampaignPlayerAbsence[];
}

// Types absences
export type { Absence, CampaignPlayerAbsence } from './absence';

export interface GeneralForumData {
  sections: ForumSectionSummary[];
}

export interface ForumPostUser {
  id: number;
  username: string;
  avatar: string;
  profil: number;
  titre?: string;
}

export interface ForumPostPerso {
  id: number;
  userId?: number | null;
  name: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
  widgets?: string | null;
}

export interface ForumPost {
  id: number;
  topicId: number;
  content: string;
  createDate: string;
  editor: number;
  user: ForumPostUser;
  perso?: ForumPostPerso | null;
  isRead: boolean;
}

export interface CharacterSummary {
  id: number;
  name: string;
  concept?: string;
  avatar?: string;
  userId?: number | null;
  campagneId: number;
}

export interface CampaignCharacter {
  id: number;
  userId: number | null;
  userName?: string | null;
  userAvatar?: string | null;
  userProfil?: number | null;
  campagneId: number;
  name: string;
  concept: string;
  avatar: string;
  publicDescription: string;
  privateDescription?: string;
  technical?: string;
  statut: number;
  catId: number | null;
  categoryName: string;
  isPlayer: boolean;
  persoFields?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
  widgets?: string | null;
}

export interface CampaignCharacterCategory {
  id: number | null;
  name: string;
  defaultCollapse: boolean;
  characters: CampaignCharacter[];
}

export interface CampaignDiceRoll {
  id: number;
  userId: number;
  campagneId: number;
  createDate: string;
  result: string;
  description: string;
  username: string;
  userAvatar?: string | null;
  userProfil?: number;
}

export interface CampaignCharactersData {
  campaign: CampaignSummary;
  categories: CampaignCharacterCategory[];
}

export interface CampaignParticipant {
  id: number;
  username: string;
  avatar: string | null;
  profil?: number;
}

export interface CreateCharacterPayload {
  name: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
  privateDescription?: string;
  technical?: string;
  catId?: number | null;
  assignedUserId?: number | null;
  statut?: number;
  persoFields?: string | null;
  widgets?: string;
}

export interface UpdateCharacterPayload {
  name?: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
  privateDescription?: string;
  technical?: string;
  catId?: number | null;
  assignedUserId?: number | null;
  statut?: number;
  persoFields?: string | null;
  widgets?: string;
}

export interface TopicDraft {
  id: number;
  topicId: number;
  userId: number;
  persoId: number | null;
  content: string;
}

export interface TopicDetail {
  id: number;
  sectionId: number;
  sectionTitle: string;
  campagneId: number | null;
  campaignTitle: string;
  title: string;
  stickable: boolean;
  isPrivate: number | boolean;
  isClosed: boolean;
  ordre: number;
  totalPosts: number;
  page: number;
  totalPages: number;
  pageSize: number;
  lastReadPostId: number | null;
  firstUnreadPostId?: number | null;
  allRead?: boolean;
  canPost: boolean;
  userRole?: 'mj' | 'player' | 'user' | null;
  availableCharacters: CharacterSummary[];
  posts: ForumPost[];
  campaign?: CampaignSummary | null;
  canReadUsers?: TopicUserSummary[];
  canReadUserIds?: number[];
  draft?: TopicDraft | null;
  dialogueColor?: string | null;
  penseeColor?: string | null;
  rp1Color?: string | null;
  rp2Color?: string | null;
  quoteColor?: string | null;
  sidebarColor?: string | null;
  oddLineColor?: string | null;
  evenLineColor?: string | null;
  textColor?: string | null;
  linkColor?: string | null;
  linkSidebarColor?: string | null;
}

export interface Note {
  id: number;
  campaignId: number;
  userId: number;
  content: string;
  lastUpdate?: string;
}

export interface CampaignNotesData {
  campaign: CampaignSummary | null;
  notes: Note[];
}

export type CampaignNoteData = CampaignNotesData;

export interface CarteMarkerPopup {
  name?: string;
  text?: string;
  image?: string;
  [key: string]: any;
}

export interface CarteMarker {
  type: 'perso' | 'custom' | string;
  id: string | number;
  position: [number, number];
  popup?: CarteMarkerPopup | any[];
}

export interface CarteConfig {
  markers?: CarteMarker[];
  tabReduce?: boolean;
  [key: string]: any;
}

export interface CarteSummary {
  id: number;
  campagneId: number;
  name: string;
  description: string;
  image: string;
  published: boolean;
}

export interface CarteCharacter {
  id: number;
  name: string;
  avatar?: string | null;
  userId: number | null;
  is_current_user: boolean;
}

export interface CarteDetail {
  id: number;
  campagneId: number;
  name: string;
  description: string;
  image: string;
  published: boolean;
  config: CarteConfig;
  personnages: CarteCharacter[];
  isMj: boolean;
  mjId?: number;
}

export interface CreateCartePayload {
  name: string;
  description?: string;
  image: string;
  published?: boolean;
  config?: CarteConfig;
}

export interface UpdateCartePayload {
  name?: string;
  description?: string;
  image?: string;
  published?: boolean;
  config?: CarteConfig;
}

export interface CampaignSearchTopicItem {
  id: number;
  title: string;
  sectionId: number;
  sectionTitle: string;
  isPrivate: boolean;
  url: string;
}

export interface CampaignSearchCarteItem {
  id: number;
  name: string;
  description: string;
  image: string | null;
  published: boolean;
  url: string;
}

export interface CampaignSearchCharacterItem {
  id: number;
  name: string;
  concept: string;
  avatar: string | null;
  categoryName: string;
  isPlayer: boolean;
  url: string;
}

export interface CampaignSearchResults {
  topics: CampaignSearchTopicItem[];
  cartes: CampaignSearchCarteItem[];
  characters: CampaignSearchCharacterItem[];
}
