export interface User {
  id: number;
  username: string;
  mail: string;
  avatar: string;
  description: string;
  profil: number;
  titre: string;
  subscribe_date: string;
  birthDate?: string | null;
}

export interface UserWithPassword extends User {
  password?: string;
}

export interface CreateUserData {
  username: string;
  mail: string;
  passwordHash: string;
  avatar?: string;
  description?: string;
  profil?: number;
  titre?: string;
}

export interface JWTPayload {
  id: number;
  username: string;
  mail: string;
  profil: number;
}

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
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
  widgets?: string | null;
  hasUnread?: boolean;
  hasAlert?: boolean;
}

export type CampaignRole = 'all' | 'master' | 'player' | 'observer';

export interface MyCampaignsFilter {
  role: CampaignRole;
  includeArchived: boolean;
}

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
  profil?: number;
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
}

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

export interface RawCampaignCharacterRow {
  id: number;
  userId: number | null;
  userName: string | null;
  userAvatar: string | null;
  userProfil: number | null;
  campagneId: number;
  name: string;
  concept: string | null;
  avatar: string | null;
  publicDescription: string | null;
  privateDescription: string | null;
  technical: string | null;
  statut: number;
  catId: number | null;
  categoryName: string | null;
  persoFields: string | null;
  widgets: string | null;
}

export interface RawPnjCategoryRow {
  id: number;
  campagneId: number;
  name: string;
  defaultCollapse: number;
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
  widgets?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}

export interface CampaignCharacterCategory {
  id: number | null;
  name: string;
  defaultCollapse: boolean;
  characters: CampaignCharacter[];
}

export interface CampaignParticipant {
  id: number;
  username: string;
  avatar: string | null;
  profil?: number;
}

export interface CampaignCharactersData {
  campaign: CampaignSummary;
  categories: CampaignCharacterCategory[];
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

export interface RawTopicDetail {
  id: number;
  sectionId: number;
  sectionTitle: string;
  campagneId: number | null;
  campaignTitle: string | null;
  title: string;
  stickable: number;
  isPrivate: number;
  isClosed: number;
  ordre: number;
  lastPostId?: number | null;
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

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  content: string;
  url: string;
  type: string;
  targetId: number;
  nb: number;
  lastUpdate: string;
}

export interface RawNotificationRow {
  id: number;
  user_id: number;
  title: string;
  content: string;
  url: string | null;
  type: string | null;
  target_id: number | null;
  nb: number;
  last_update: string;
}

export interface MessageRecipient {
  id: number;
  username: string;
  avatar?: string | null;
  profil?: number;
  statut: number; // 0 = unread, 1 = read, 2 = deleted from inbox
  isRead: boolean;
}

export interface InboxMessageSummary {
  id: number;
  fromId: number;
  fromUsername: string;
  fromAvatar?: string | null;
  fromProfil?: number;
  title: string;
  time: string;
  statut: number;
  isRead: boolean;
  recipients?: MessageRecipient[];
}

export interface SentMessageSummary {
  id: number;
  fromId: number;
  fromUsername: string;
  fromProfil?: number;
  title: string;
  time: string;
  statut: number;
  recipients: MessageRecipient[];
  isRead: boolean; // true if all recipients have read it (statut >= 1)
}

export interface MessageDetail {
  id: number;
  fromId: number;
  fromUsername: string;
  fromAvatar?: string | null;
  fromProfil?: number;
  title: string;
  content: string;
  time: string;
  statut: number;
  recipients: MessageRecipient[];
  isSender: boolean;
  isRead: boolean;
}

export interface Note {
  id: number;
  campaignId: number;
  userId: number;
  content: string;
  lastUpdate?: string;
}

export interface RawNoteRow {
  id: number;
  campagne_id: number;
  user_id: number;
  content: string;
  last_update: string;
}

export interface CampaignNotesData {
  campaign: CampaignSummary;
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

export interface CarteDetail {
  id: number;
  campagneId: number;
  name: string;
  description: string;
  image: string;
  published: boolean;
  config: CarteConfig;
  personnages: Array<{
    id: number;
    name: string;
    avatar?: string | null;
    userId: number | null;
    is_current_user: boolean;
  }>;
  isMj: boolean;
  mjId?: number;
}

export interface RawCarteRow {
  id: number;
  campagne_id: number;
  name: string | null;
  description: string | null;
  image: string | null;
  published: number | null;
  config: string | null;
  mj_id?: number | null;
}

export interface ChatMessage {
  id: number;
  username: string;
  userAvatar?: string | null;
  userProfil?: number;
  time: string;
  message: string;
  to: string;
  to_username: string;
}

export interface SendChatMessageInput {
  userId: number;
  username: string;
  message: string;
  to?: string | null;
  to_username?: string | null;
}

export interface ChatConnectedUser {
  id: number;
  username: string;
  avatar?: string;
  profil?: number;
}
