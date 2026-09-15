export interface CampaignSummary {
  id: number;
  name: string;
  mjId: number;
  mjUsername: string;
  mjAvatar?: string;
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
  userRole?: 'mj' | 'player';
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
  hasUnread?: boolean;
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
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload>;

export type CampaignRole = 'all' | 'master' | 'player';

export interface ForumLastPost {
  id: number;
  createDate: string;
  userId: number;
  username: string;
  userAvatar?: string;
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
  name: string;
  concept?: string;
  avatar?: string;
  publicDescription?: string;
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
}

export interface CampaignCharactersData {
  campaign: CampaignSummary;
  categories: CampaignCharacterCategory[];
}

export interface CampaignParticipant {
  id: number;
  username: string;
  avatar: string | null;
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
