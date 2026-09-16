import { query, queryOne, execute } from '../db/mysql.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../types/index.js';

export interface CreateCampaignData {
  mjId: number;
  name: string;
  systeme?: string;
  univers?: string;
  description?: string;
  nbJoueurs: number;
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
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}

export interface UpdateCampaignData {
  name?: string;
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
  template?: string | null;
  templateHtml?: string | null;
  templateImg?: string | null;
  templateFields?: string | null;
}

export interface ICampaignRepository {
  findMasteredCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findPlayerCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findObservedCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findAllCampaigns(options?: { includeArchived?: boolean; search?: string }): Promise<CampaignSummary[]>;
  findById(id: number): Promise<CampaignSummary | null>;
  createCampaign(data: CreateCampaignData): Promise<number>;
  updateCampaign(id: number, data: UpdateCampaignData): Promise<void>;
  findCampaignCharacters(campaignId: number): Promise<RawCampaignCharacterRow[]>;
  findCampaignPnjCategories(campaignId: number): Promise<RawPnjCategoryRow[]>;
  findPnjCategoryById(id: number): Promise<RawPnjCategoryRow | null>;
  createPnjCategory(category: {
    campagneId: number;
    name: string;
    defaultCollapse: number;
  }): Promise<number>;
  updatePnjCategory(
    id: number,
    data: Partial<{
      name: string;
      defaultCollapse: number;
    }>
  ): Promise<void>;
  deletePnjCategory(id: number): Promise<void>;
  findCharacterById(id: number): Promise<RawCampaignCharacterRow | null>;
  createCharacter(character: {
    campagneId: number;
    userId: number | null;
    name: string;
    concept: string;
    avatar: string;
    publicDescription: string;
    privateDescription: string;
    technical: string;
    statut: number;
    catId: number | null;
    persoFields?: string | null;
    widgets?: string;
  }): Promise<number>;
  updateCharacter(
    id: number,
    character: Partial<{
      userId: number | null;
      name: string;
      concept: string;
      avatar: string;
      publicDescription: string;
      privateDescription: string;
      technical: string;
      statut: number;
      catId: number | null;
      persoFields: string | null;
      widgets: string;
    }>
  ): Promise<void>;
  deleteCharacter(id: number): Promise<void>;
  updateCampaignBanner(campagneId: number, bannerUrl: string): Promise<void>;
  findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]>;
  isUserCampaignParticipant(campaignId: number, userId: number): Promise<boolean>;
  addCampaignParticipant(campaignId: number, userId: number): Promise<void>;
  isUserCampaignObserver(campaignId: number, userId: number): Promise<boolean>;
  addCampaignObserver(campaignId: number, userId: number): Promise<void>;
  removeCampaignObserver(campaignId: number, userId: number): Promise<void>;
  findCampaignObservers(campaignId: number): Promise<Array<{ id: number; username: string; avatar: string | null }>>;
  isUserCampaignAlert(campaignId: number, userId: number): Promise<boolean>;
  addCampaignAlert(campaignId: number, userId: number): Promise<void>;
  removeCampaignAlert(campaignId: number, userId: number): Promise<void>;
}

export class MysqlCampaignRepository implements ICampaignRepository {
  async findMasteredCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    const archiveCondition = includeArchived ? '' : 'AND c.statut != 2';
    const sql = `
      SELECT 
        c.id,
        c.mj_id AS mjId,
        u.username AS mjUsername,
        u.avatar AS mjAvatar,
        c.nb_joueurs AS nbJoueurs,
        c.nb_joueurs_actuel AS nbJoueursActuel,
        c.name,
        c.banniere,
        c.systeme,
        c.univers,
        c.description,
        c.statut,
        c.is_recrutement_open AS isRecrutementOpen,
        c.rythme,
        c.rp,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        cc.banniere AS banniereForum,
        EXISTS (
          SELECT 1
          FROM sections s
          JOIN topics t ON t.section_id = s.id
          LEFT JOIN (
            SELECT topic_id, MAX(post_id) AS post_id
            FROM read_post
            WHERE user_id = ?
            GROUP BY topic_id
          ) rp ON rp.topic_id = t.id
          WHERE s.campagne_id = c.id
            AND t.last_post_id IS NOT NULL
            AND (rp.post_id IS NULL OR rp.post_id < t.last_post_id)
        ) AS hasUnread,
        EXISTS (
          SELECT 1
          FROM alert a
          WHERE a.campagne_id = c.id
            AND a.joueur_id = ?
        ) AS hasAlert
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      WHERE c.mj_id = ?
        ${archiveCondition}
      ORDER BY hasAlert DESC, c.id DESC
    `;

    interface RawCampaignRow {
      id: number;
      mjId: number;
      mjUsername: string;
      mjAvatar: string | null;
      nbJoueurs: number;
      nbJoueursActuel: number;
      name: string;
      banniere: string | null;
      banniereForum: string | null;
      systeme: string;
      univers: string;
      description: string;
      statut: number;
      isRecrutementOpen: number;
      rythme: number | null;
      rp: number | null;
      dialogueColor: string | null;
      penseeColor: string | null;
      rp1Color: string | null;
      rp2Color: string | null;
      quoteColor: string | null;
      sidebarColor: string | null;
      oddLineColor: string | null;
      evenLineColor: string | null;
      textColor: string | null;
      linkColor: string | null;
      linkSidebarColor: string | null;
      hasUnread?: number | boolean;
      hasAlert?: number | boolean;
    }

    const rows = await query<RawCampaignRow>(sql, [userId, userId, userId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
      banniereForum: row.banniereForum || null,
      systeme: row.systeme,
      univers: row.univers,
      description: row.description,
      statut: row.statut,
      isArchived: row.statut === 2,
      isRecrutementOpen: Boolean(row.isRecrutementOpen),
      rythme: row.rythme ?? undefined,
      rp: row.rp ?? undefined,
      dialogueColor: row.dialogueColor || null,
      penseeColor: row.penseeColor || null,
      rp1Color: row.rp1Color || null,
      rp2Color: row.rp2Color || null,
      quoteColor: row.quoteColor || null,
      sidebarColor: row.sidebarColor || null,
      oddLineColor: row.oddLineColor || null,
      evenLineColor: row.evenLineColor || null,
      textColor: row.textColor || null,
      linkColor: row.linkColor || null,
      linkSidebarColor: row.linkSidebarColor || null,
      userRole: 'mj',
      hasUnread: Boolean(row.hasUnread),
      hasAlert: Boolean(row.hasAlert),
    }));
  }

  async findPlayerCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    const archiveCondition = includeArchived ? '' : 'AND c.statut != 2';
    const sql = `
      SELECT 
        c.id,
        c.mj_id AS mjId,
        u.username AS mjUsername,
        u.avatar AS mjAvatar,
        c.nb_joueurs AS nbJoueurs,
        c.nb_joueurs_actuel AS nbJoueursActuel,
        c.name,
        c.banniere,
        c.systeme,
        c.univers,
        c.description,
        c.statut,
        c.is_recrutement_open AS isRecrutementOpen,
        c.rythme,
        c.rp,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        cc.banniere AS banniereForum,
        p.name AS characterName,
        p.avatar AS characterAvatar,
        EXISTS (
          SELECT 1
          FROM sections s
          JOIN topics t ON t.section_id = s.id
          LEFT JOIN (
            SELECT topic_id, MAX(post_id) AS post_id
            FROM read_post
            WHERE user_id = ?
            GROUP BY topic_id
          ) rp ON rp.topic_id = t.id
          WHERE s.campagne_id = c.id
            AND t.last_post_id IS NOT NULL
            AND (rp.post_id IS NULL OR rp.post_id < t.last_post_id)
        ) AS hasUnread,
        EXISTS (
          SELECT 1
          FROM alert a
          WHERE a.campagne_id = c.id
            AND a.joueur_id = ?
        ) AS hasAlert
      FROM campagne_participant cp
      JOIN campagne c ON cp.campagne_id = c.id
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      LEFT JOIN personnages p ON p.campagne_id = c.id AND p.user_id = cp.user_id
      WHERE cp.user_id = ?
        ${archiveCondition}
      ORDER BY hasAlert DESC, c.id DESC
    `;

    interface RawPlayerCampaignRow {
      id: number;
      mjId: number;
      mjUsername: string;
      mjAvatar: string | null;
      nbJoueurs: number;
      nbJoueursActuel: number;
      name: string;
      banniere: string | null;
      banniereForum: string | null;
      systeme: string;
      univers: string;
      description: string;
      statut: number;
      isRecrutementOpen: number;
      rythme: number | null;
      rp: number | null;
      dialogueColor: string | null;
      penseeColor: string | null;
      rp1Color: string | null;
      rp2Color: string | null;
      quoteColor: string | null;
      sidebarColor: string | null;
      oddLineColor: string | null;
      evenLineColor: string | null;
      textColor: string | null;
      linkColor: string | null;
      linkSidebarColor: string | null;
      characterName: string | null;
      characterAvatar: string | null;
      hasUnread?: number | boolean;
      hasAlert?: number | boolean;
    }

    const rows = await query<RawPlayerCampaignRow>(sql, [userId, userId, userId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
      banniereForum: row.banniereForum || null,
      systeme: row.systeme,
      univers: row.univers,
      description: row.description,
      statut: row.statut,
      isArchived: row.statut === 2,
      isRecrutementOpen: Boolean(row.isRecrutementOpen),
      rythme: row.rythme ?? undefined,
      rp: row.rp ?? undefined,
      dialogueColor: row.dialogueColor || null,
      penseeColor: row.penseeColor || null,
      rp1Color: row.rp1Color || null,
      rp2Color: row.rp2Color || null,
      quoteColor: row.quoteColor || null,
      sidebarColor: row.sidebarColor || null,
      oddLineColor: row.oddLineColor || null,
      evenLineColor: row.evenLineColor || null,
      textColor: row.textColor || null,
      linkColor: row.linkColor || null,
      linkSidebarColor: row.linkSidebarColor || null,
      userRole: 'player',
      characterName: row.characterName || null,
      characterAvatar: row.characterAvatar || null,
      hasUnread: Boolean(row.hasUnread),
      hasAlert: Boolean(row.hasAlert),
    }));
  }

  async findObservedCampaigns(userId: number, includeArchived: boolean = false): Promise<CampaignSummary[]> {
    const archiveCondition = includeArchived ? '' : 'AND c.statut != 2';
    const sql = `
      SELECT 
        c.id,
        c.mj_id AS mjId,
        u.username AS mjUsername,
        u.avatar AS mjAvatar,
        c.nb_joueurs AS nbJoueurs,
        c.nb_joueurs_actuel AS nbJoueursActuel,
        c.name,
        c.banniere,
        c.systeme,
        c.univers,
        c.description,
        c.statut,
        c.is_recrutement_open AS isRecrutementOpen,
        c.rythme,
        c.rp,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        cc.banniere AS banniereForum,
        EXISTS (
          SELECT 1
          FROM sections s
          JOIN topics t ON t.section_id = s.id
          LEFT JOIN (
            SELECT topic_id, MAX(post_id) AS post_id
            FROM read_post
            WHERE user_id = ?
            GROUP BY topic_id
          ) rp ON rp.topic_id = t.id
          WHERE s.campagne_id = c.id
            AND t.last_post_id IS NOT NULL
            AND (rp.post_id IS NULL OR rp.post_id < t.last_post_id)
        ) AS hasUnread,
        EXISTS (
          SELECT 1
          FROM alert a
          WHERE a.campagne_id = c.id
            AND a.joueur_id = ?
        ) AS hasAlert
      FROM campagne_favoris cf
      JOIN campagne c ON cf.campagne_id = c.id
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      WHERE cf.user_id = ?
        ${archiveCondition}
      ORDER BY hasAlert DESC, c.id DESC
    `;

    interface RawObservedCampaignRow {
      id: number;
      mjId: number;
      mjUsername: string;
      mjAvatar: string | null;
      nbJoueurs: number;
      nbJoueursActuel: number;
      name: string;
      banniere: string | null;
      banniereForum: string | null;
      systeme: string;
      univers: string;
      description: string;
      statut: number;
      isRecrutementOpen: number;
      rythme: number | null;
      rp: number | null;
      dialogueColor: string | null;
      penseeColor: string | null;
      rp1Color: string | null;
      rp2Color: string | null;
      quoteColor: string | null;
      sidebarColor: string | null;
      oddLineColor: string | null;
      evenLineColor: string | null;
      textColor: string | null;
      linkColor: string | null;
      linkSidebarColor: string | null;
      hasUnread?: number | boolean;
      hasAlert?: number | boolean;
    }

    const rows = await query<RawObservedCampaignRow>(sql, [userId, userId, userId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
      banniereForum: row.banniereForum || null,
      systeme: row.systeme,
      univers: row.univers,
      description: row.description,
      statut: row.statut,
      isArchived: row.statut === 2,
      isRecrutementOpen: Boolean(row.isRecrutementOpen),
      rythme: row.rythme ?? undefined,
      rp: row.rp ?? undefined,
      dialogueColor: row.dialogueColor || null,
      penseeColor: row.penseeColor || null,
      rp1Color: row.rp1Color || null,
      rp2Color: row.rp2Color || null,
      quoteColor: row.quoteColor || null,
      sidebarColor: row.sidebarColor || null,
      oddLineColor: row.oddLineColor || null,
      evenLineColor: row.evenLineColor || null,
      textColor: row.textColor || null,
      linkColor: row.linkColor || null,
      linkSidebarColor: row.linkSidebarColor || null,
      userRole: 'observer',
      isObserving: true,
      hasUnread: Boolean(row.hasUnread),
      hasAlert: Boolean(row.hasAlert),
    }));
  }

  async findAllCampaigns(options: { includeArchived?: boolean; search?: string } = {}): Promise<CampaignSummary[]> {
    const { includeArchived = false, search } = options;
    const conditions: string[] = [];
    const params: any[] = [];

    // Exclure les campagnes en préparation (statut = 3)
    conditions.push('c.statut != 3');

    if (!includeArchived) {
      conditions.push('c.statut != 2');
    }

    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push('(c.name LIKE ? OR c.systeme LIKE ? OR c.univers LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.id,
        c.mj_id AS mjId,
        u.username AS mjUsername,
        u.avatar AS mjAvatar,
        c.nb_joueurs AS nbJoueurs,
        c.nb_joueurs_actuel AS nbJoueursActuel,
        c.name,
        c.banniere,
        c.systeme,
        c.univers,
        c.description,
        c.statut,
        c.is_recrutement_open AS isRecrutementOpen,
        c.rythme,
        c.rp,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        cc.banniere AS banniereForum
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      ${whereClause}
      ORDER BY c.id DESC
    `;

    interface RawCampaignRow {
      id: number;
      mjId: number;
      mjUsername: string;
      mjAvatar: string | null;
      nbJoueurs: number;
      nbJoueursActuel: number;
      name: string;
      banniere: string | null;
      banniereForum: string | null;
      systeme: string;
      univers: string;
      description: string;
      statut: number;
      isRecrutementOpen: number;
      rythme: number | null;
      rp: number | null;
      dialogueColor: string | null;
      penseeColor: string | null;
      rp1Color: string | null;
      rp2Color: string | null;
      quoteColor: string | null;
      sidebarColor: string | null;
      oddLineColor: string | null;
      evenLineColor: string | null;
      textColor: string | null;
      linkColor: string | null;
      linkSidebarColor: string | null;
    }

    const rows = await query<RawCampaignRow>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
      banniereForum: row.banniereForum || null,
      systeme: row.systeme,
      univers: row.univers,
      description: row.description,
      statut: row.statut,
      isArchived: row.statut === 2,
      isRecrutementOpen: Boolean(row.isRecrutementOpen),
      rythme: row.rythme ?? undefined,
      rp: row.rp ?? undefined,
      dialogueColor: row.dialogueColor || null,
      penseeColor: row.penseeColor || null,
      rp1Color: row.rp1Color || null,
      rp2Color: row.rp2Color || null,
      quoteColor: row.quoteColor || null,
      sidebarColor: row.sidebarColor || null,
      oddLineColor: row.oddLineColor || null,
      evenLineColor: row.evenLineColor || null,
      textColor: row.textColor || null,
      linkColor: row.linkColor || null,
      linkSidebarColor: row.linkSidebarColor || null,
    }));
  }

  async findById(id: number): Promise<CampaignSummary | null> {
    const sql = `
      SELECT 
        c.id,
        c.mj_id AS mjId,
        u.username AS mjUsername,
        u.avatar AS mjAvatar,
        c.nb_joueurs AS nbJoueurs,
        c.nb_joueurs_actuel AS nbJoueursActuel,
        c.name,
        c.banniere,
        c.systeme,
        c.univers,
        c.description,
        c.statut,
        c.is_recrutement_open AS isRecrutementOpen,
        c.rythme,
        c.rp,
        c.is_multi_character AS isMultiCharacter,
        cc.dialogue_color AS dialogueColor,
        cc.pensee_color AS penseeColor,
        cc.rp1_color AS rp1Color,
        cc.rp2_color AS rp2Color,
        cc.quote_color AS quoteColor,
        cc.sidebar_color AS sidebarColor,
        cc.odd_line_color AS oddLineColor,
        cc.even_line_color AS evenLineColor,
        cc.text_color AS textColor,
        cc.link_color AS linkColor,
        cc.link_sidebar_color AS linkSidebarColor,
        cc.hr,
        cc.width,
        cc.default_dice AS defaultDice,
        cc.template,
        cc.template_html AS templateHtml,
        cc.template_img AS templateImg,
        cc.template_fields AS templateFields,
        cc.banniere AS banniereForum
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      WHERE c.id = ?
      LIMIT 1
    `;

    interface RawCampaignRow {
      id: number;
      mjId: number;
      mjUsername: string;
      mjAvatar: string | null;
      nbJoueurs: number;
      nbJoueursActuel: number;
      name: string;
      banniere: string | null;
      banniereForum: string | null;
      systeme: string;
      univers: string;
      description: string;
      statut: number;
      isRecrutementOpen: number;
      rythme: number | null;
      rp: number | null;
      isMultiCharacter: number | null;
      dialogueColor: string | null;
      penseeColor: string | null;
      rp1Color: string | null;
      rp2Color: string | null;
      quoteColor: string | null;
      sidebarColor: string | null;
      oddLineColor: string | null;
      evenLineColor: string | null;
      textColor: string | null;
      linkColor: string | null;
      linkSidebarColor: string | null;
      hr: string | null;
      width: string | null;
      defaultDice: string | null;
      template: string | null;
      templateHtml: string | null;
      templateImg: string | null;
      templateFields: string | null;
    }

    const rows = await query<RawCampaignRow>(sql, [id]);
    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
      banniereForum: row.banniereForum || null,
      systeme: row.systeme,
      univers: row.univers,
      description: row.description,
      statut: row.statut,
      isArchived: row.statut === 2,
      isRecrutementOpen: Boolean(row.isRecrutementOpen),
      rythme: row.rythme ?? undefined,
      rp: row.rp ?? undefined,
      isMultiCharacter: Boolean(row.isMultiCharacter),
      dialogueColor: row.dialogueColor || null,
      penseeColor: row.penseeColor || null,
      rp1Color: row.rp1Color || null,
      rp2Color: row.rp2Color || null,
      quoteColor: row.quoteColor || null,
      sidebarColor: row.sidebarColor || null,
      oddLineColor: row.oddLineColor || null,
      evenLineColor: row.evenLineColor || null,
      textColor: row.textColor || null,
      linkColor: row.linkColor || null,
      linkSidebarColor: row.linkSidebarColor || null,
      hr: row.hr || null,
      width: row.width || null,
      defaultDice: row.defaultDice || null,
      template: row.template || null,
      templateHtml: row.templateHtml || null,
      templateImg: row.templateImg || null,
      templateFields: row.templateFields || null,
    };
  }

  async createCampaign(data: CreateCampaignData): Promise<number> {
    const campagneSql = `
      INSERT INTO campagne (
        mj_id, nb_joueurs, nb_joueurs_actuel, name, banniere,
        systeme, univers, description, statut, is_recrutement_open,
        rythme, rp, is_admin_open, is_multi_character
      ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `;

    const res = await execute(campagneSql, [
      data.mjId,
      data.nbJoueurs,
      data.name,
      data.banniere || '',
      data.systeme || '',
      data.univers || '',
      data.description || '',
      data.statut ?? 0,
      data.isRecrutementOpen !== false ? 1 : 0,
      data.rythme ?? 2,
      data.rp ?? 1,
      data.isMultiCharacter ? 1 : 0,
    ]);

    const campaignId = res.insertId;

    const configSql = `
      INSERT INTO campagne_config (
        campagne_id, banniere, hr, odd_line_color, even_line_color,
        sidebar_color, link_color, template, sidebar_text, link_sidebar_color,
        text_color, dialogue_color, pensee_color, rp1_color, rp2_color,
        quote_color, width, widgets, default_dice,
        template_html, template_img, template_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
    `;

    await execute(configSql, [
      campaignId,
      data.banniereForum !== undefined ? data.banniereForum : (data.banniere || null),
      data.hr || null,
      data.oddLineColor || null,
      data.evenLineColor || null,
      data.sidebarColor || null,
      data.linkColor || null,
      data.template || '',
      data.linkSidebarColor || '',
      data.textColor || null,
      data.dialogueColor || '#4488cc',
      data.penseeColor || '#8844cc',
      data.rp1Color || '#ff6600',
      data.rp2Color || '#5eff6c',
      data.quoteColor || null,
      data.width || '800px',
      data.defaultDice || '1d20',
      data.templateHtml || null,
      data.templateImg || null,
      data.templateFields || null,
    ]);

    return campaignId;
  }

  async updateCampaign(id: number, data: UpdateCampaignData): Promise<void> {
    const campagneFields: string[] = [];
    const campagneParams: any[] = [];

    if (data.name !== undefined) {
      campagneFields.push('name = ?');
      campagneParams.push(data.name);
    }
    if (data.systeme !== undefined) {
      campagneFields.push('systeme = ?');
      campagneParams.push(data.systeme);
    }
    if (data.univers !== undefined) {
      campagneFields.push('univers = ?');
      campagneParams.push(data.univers);
    }
    if (data.description !== undefined) {
      campagneFields.push('description = ?');
      campagneParams.push(data.description);
    }
    if (data.nbJoueurs !== undefined) {
      campagneFields.push('nb_joueurs = ?');
      campagneParams.push(data.nbJoueurs);
    }
    if (data.banniere !== undefined) {
      campagneFields.push('banniere = ?');
      campagneParams.push(data.banniere ?? '');
    }
    if (data.statut !== undefined) {
      campagneFields.push('statut = ?');
      campagneParams.push(data.statut);
    }
    if (data.isRecrutementOpen !== undefined) {
      campagneFields.push('is_recrutement_open = ?');
      campagneParams.push(data.isRecrutementOpen ? 1 : 0);
    }
    if (data.rythme !== undefined) {
      campagneFields.push('rythme = ?');
      campagneParams.push(data.rythme);
    }
    if (data.rp !== undefined) {
      campagneFields.push('rp = ?');
      campagneParams.push(data.rp);
    }
    if (data.isMultiCharacter !== undefined) {
      campagneFields.push('is_multi_character = ?');
      campagneParams.push(data.isMultiCharacter ? 1 : 0);
    }

    if (campagneFields.length > 0) {
      campagneParams.push(id);
      await execute(`UPDATE campagne SET ${campagneFields.join(', ')} WHERE id = ?`, campagneParams);
    }

    const configFields: string[] = [];
    const configParams: any[] = [];

    if (data.banniereForum !== undefined) {
      configFields.push('banniere = ?');
      configParams.push(data.banniereForum);
    }
    if (data.hr !== undefined) {
      configFields.push('hr = ?');
      configParams.push(data.hr);
    }
    if (data.oddLineColor !== undefined) {
      configFields.push('odd_line_color = ?');
      configParams.push(data.oddLineColor);
    }
    if (data.evenLineColor !== undefined) {
      configFields.push('even_line_color = ?');
      configParams.push(data.evenLineColor);
    }
    if (data.sidebarColor !== undefined) {
      configFields.push('sidebar_color = ?');
      configParams.push(data.sidebarColor);
    }
    if (data.linkColor !== undefined) {
      configFields.push('link_color = ?');
      configParams.push(data.linkColor);
    }
    if (data.linkSidebarColor !== undefined) {
      configFields.push('link_sidebar_color = ?');
      configParams.push(data.linkSidebarColor ?? '');
    }
    if (data.textColor !== undefined) {
      configFields.push('text_color = ?');
      configParams.push(data.textColor);
    }
    if (data.dialogueColor !== undefined) {
      configFields.push('dialogue_color = ?');
      configParams.push(data.dialogueColor);
    }
    if (data.penseeColor !== undefined) {
      configFields.push('pensee_color = ?');
      configParams.push(data.penseeColor);
    }
    if (data.rp1Color !== undefined) {
      configFields.push('rp1_color = ?');
      configParams.push(data.rp1Color);
    }
    if (data.rp2Color !== undefined) {
      configFields.push('rp2_color = ?');
      configParams.push(data.rp2Color);
    }
    if (data.quoteColor !== undefined) {
      configFields.push('quote_color = ?');
      configParams.push(data.quoteColor);
    }
    if (data.width !== undefined) {
      configFields.push('width = ?');
      configParams.push(data.width ?? '800px');
    }
    if (data.defaultDice !== undefined) {
      configFields.push('default_dice = ?');
      configParams.push(data.defaultDice ?? '1d20');
    }
    if (data.template !== undefined) {
      configFields.push('template = ?');
      configParams.push(data.template ?? '');
    }
    if (data.templateHtml !== undefined) {
      configFields.push('template_html = ?');
      configParams.push(data.templateHtml);
    }
    if (data.templateImg !== undefined) {
      configFields.push('template_img = ?');
      configParams.push(data.templateImg);
    }
    if (data.templateFields !== undefined) {
      configFields.push('template_fields = ?');
      configParams.push(data.templateFields);
    }

    if (configFields.length > 0) {
      const existingConfig = await queryOne<{ campagne_id: number }>(
        'SELECT campagne_id FROM campagne_config WHERE campagne_id = ?',
        [id]
      );

      if (existingConfig) {
        configParams.push(id);
        await execute(
          `UPDATE campagne_config SET ${configFields.join(', ')} WHERE campagne_id = ?`,
          configParams
        );
      } else {
        const insertSql = `
          INSERT INTO campagne_config (
            campagne_id, banniere, hr, odd_line_color, even_line_color,
            sidebar_color, link_color, template, sidebar_text, link_sidebar_color,
            text_color, dialogue_color, pensee_color, rp1_color, rp2_color,
            quote_color, width, widgets, default_dice,
            template_html, template_img, template_fields
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
        `;
        await execute(insertSql, [
          id,
          data.banniereForum ?? null,
          data.hr ?? null,
          data.oddLineColor ?? null,
          data.evenLineColor ?? null,
          data.sidebarColor ?? null,
          data.linkColor ?? null,
          data.template ?? '',
          data.linkSidebarColor ?? '',
          data.textColor ?? null,
          data.dialogueColor ?? '#4488cc',
          data.penseeColor ?? '#8844cc',
          data.rp1Color ?? '#ff6600',
          data.rp2Color ?? '#5eff6c',
          data.quoteColor ?? null,
          data.width ?? '800px',
          data.defaultDice ?? '1d20',
          data.templateHtml ?? null,
          data.templateImg ?? null,
          data.templateFields ?? null,
        ]);
      }
    }
  }

  async findCampaignCharacters(campaignId: number): Promise<RawCampaignCharacterRow[]> {
    const sql = `
      SELECT 
        p.id,
        p.user_id AS userId,
        u.username AS userName,
        u.avatar AS userAvatar,
        p.campagne_id AS campagneId,
        p.name,
        p.concept,
        p.avatar,
        p.publicDescription,
        p.privateDescription,
        p.technical,
        p.statut,
        p.cat_id AS catId,
        c.name AS categoryName,
        p.perso_fields AS persoFields,
        p.widgets
      FROM personnages p
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN pnj_category c ON p.cat_id = c.id
      WHERE p.campagne_id = ?
      ORDER BY p.name ASC
    `;

    return query<RawCampaignCharacterRow>(sql, [campaignId]);
  }

  async findCampaignPnjCategories(campaignId: number): Promise<RawPnjCategoryRow[]> {
    const sql = `
      SELECT 
        id,
        campagne_id AS campagneId,
        name,
        default_collapse AS defaultCollapse
      FROM pnj_category
      WHERE campagne_id = ?
      ORDER BY id ASC
    `;

    return query<RawPnjCategoryRow>(sql, [campaignId]);
  }

  async findPnjCategoryById(id: number): Promise<RawPnjCategoryRow | null> {
    const sql = `
      SELECT 
        id,
        campagne_id AS campagneId,
        name,
        default_collapse AS defaultCollapse
      FROM pnj_category
      WHERE id = ?
      LIMIT 1
    `;

    return queryOne<RawPnjCategoryRow>(sql, [id]);
  }

  async createPnjCategory(category: {
    campagneId: number;
    name: string;
    defaultCollapse: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO pnj_category (
        campagne_id,
        name,
        default_collapse
      ) VALUES (?, ?, ?)
    `;

    const result = await execute(sql, [
      category.campagneId,
      category.name,
      category.defaultCollapse,
    ]);

    return result.insertId;
  }

  async updatePnjCategory(
    id: number,
    data: Partial<{
      name: string;
      defaultCollapse: number;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.defaultCollapse !== undefined) {
      fields.push('default_collapse = ?');
      values.push(data.defaultCollapse);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE pnj_category SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, values);
  }

  async deletePnjCategory(id: number): Promise<void> {
    await execute('UPDATE personnages SET cat_id = NULL WHERE cat_id = ?', [id]);
    await execute('DELETE FROM pnj_category WHERE id = ?', [id]);
  }

  async findCharacterById(id: number): Promise<RawCampaignCharacterRow | null> {
    const sql = `
      SELECT 
        p.id,
        p.user_id AS userId,
        u.username AS userName,
        u.avatar AS userAvatar,
        p.campagne_id AS campagneId,
        p.name,
        p.concept,
        p.avatar,
        p.publicDescription,
        p.privateDescription,
        p.technical,
        p.statut,
        p.cat_id AS catId,
        c.name AS categoryName,
        p.perso_fields AS persoFields,
        p.widgets
      FROM personnages p
      LEFT JOIN user u ON p.user_id = u.id
      LEFT JOIN pnj_category c ON p.cat_id = c.id
      WHERE p.id = ?
      LIMIT 1
    `;

    return queryOne<RawCampaignCharacterRow>(sql, [id]);
  }

  async createCharacter(character: {
    campagneId: number;
    userId: number | null;
    name: string;
    concept: string;
    avatar: string;
    publicDescription: string;
    privateDescription: string;
    technical: string;
    statut: number;
    catId: number | null;
    persoFields?: string | null;
    widgets?: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO personnages (
        campagne_id,
        user_id,
        name,
        concept,
        avatar,
        publicDescription,
        privateDescription,
        technical,
        statut,
        cat_id,
        perso_fields,
        widgets
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await execute(sql, [
      character.campagneId,
      character.userId,
      character.name,
      character.concept,
      character.avatar,
      character.publicDescription,
      character.privateDescription,
      character.technical,
      character.statut,
      character.catId,
      character.persoFields ?? null,
      character.widgets ?? '',
    ]);

    return result.insertId;
  }

  async updateCharacter(
    id: number,
    character: Partial<{
      userId: number | null;
      name: string;
      concept: string;
      avatar: string;
      publicDescription: string;
      privateDescription: string;
      technical: string;
      statut: number;
      catId: number | null;
      persoFields: string | null;
      widgets: string;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (character.userId !== undefined) {
      fields.push('user_id = ?');
      values.push(character.userId);
    }
    if (character.name !== undefined) {
      fields.push('name = ?');
      values.push(character.name);
    }
    if (character.concept !== undefined) {
      fields.push('concept = ?');
      values.push(character.concept);
    }
    if (character.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(character.avatar);
    }
    if (character.publicDescription !== undefined) {
      fields.push('publicDescription = ?');
      values.push(character.publicDescription);
    }
    if (character.privateDescription !== undefined) {
      fields.push('privateDescription = ?');
      values.push(character.privateDescription);
    }
    if (character.technical !== undefined) {
      fields.push('technical = ?');
      values.push(character.technical);
    }
    if (character.statut !== undefined) {
      fields.push('statut = ?');
      values.push(character.statut);
    }
    if (character.catId !== undefined) {
      fields.push('cat_id = ?');
      values.push(character.catId);
    }
    if (character.persoFields !== undefined) {
      fields.push('perso_fields = ?');
      values.push(character.persoFields);
    }
    if (character.widgets !== undefined) {
      fields.push('widgets = ?');
      values.push(character.widgets);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE personnages SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, values);
  }

  async deleteCharacter(id: number): Promise<void> {
    await execute('DELETE FROM personnages WHERE id = ?', [id]);
  }

  async updateCampaignBanner(campagneId: number, bannerUrl: string): Promise<void> {
    const configUpsertSql = `
      INSERT INTO campagne_config (campagne_id, banniere, template, sidebar_text, link_sidebar_color, widgets)
      VALUES (?, ?, '', '', '', '')
      ON DUPLICATE KEY UPDATE banniere = VALUES(banniere)
    `;
    await execute(configUpsertSql, [campagneId, bannerUrl]);
    await execute(`UPDATE campagne SET banniere = CASE WHEN banniere IS NULL OR banniere = '' THEN ? ELSE banniere END WHERE id = ?`, [bannerUrl, campagneId]);
  }

  async findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]> {
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.avatar
      FROM campagne_participant cp
      JOIN user u ON cp.user_id = u.id
      WHERE cp.campagne_id = ?
      ORDER BY u.username ASC
    `;

    return query<CampaignParticipant>(sql, [campaignId]);
  }

  async isUserCampaignParticipant(campaignId: number, userId: number): Promise<boolean> {
    const sql = `SELECT user_id FROM campagne_participant WHERE campagne_id = ? AND user_id = ?`;
    const row = await queryOne<{ user_id: number }>(sql, [campaignId, userId]);
    return Boolean(row);
  }

  async addCampaignParticipant(campaignId: number, userId: number): Promise<void> {
    const sql = `
      INSERT INTO campagne_participant (campagne_id, user_id, statut)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE statut = 1
    `;
    await execute(sql, [campaignId, userId]);
    const countSql = `
      UPDATE campagne
      SET nb_joueurs_actuel = (
        SELECT COUNT(DISTINCT user_id) FROM campagne_participant WHERE campagne_id = ?
      )
      WHERE id = ?
    `;
    await execute(countSql, [campaignId, campaignId]);
  }

  async isUserCampaignObserver(campaignId: number, userId: number): Promise<boolean> {
    const sql = `SELECT user_id FROM campagne_favoris WHERE campagne_id = ? AND user_id = ?`;
    const row = await queryOne<{ user_id: number }>(sql, [campaignId, userId]);
    return Boolean(row);
  }

  async addCampaignObserver(campaignId: number, userId: number): Promise<void> {
    const sql = `INSERT IGNORE INTO campagne_favoris (campagne_id, user_id) VALUES (?, ?)`;
    await execute(sql, [campaignId, userId]);
  }

  async removeCampaignObserver(campaignId: number, userId: number): Promise<void> {
    const sql = `DELETE FROM campagne_favoris WHERE campagne_id = ? AND user_id = ?`;
    await execute(sql, [campaignId, userId]);
  }

  async findCampaignObservers(campaignId: number): Promise<Array<{ id: number; username: string; avatar: string | null }>> {
    const sql = `
      SELECT 
        u.id,
        u.username,
        u.avatar
      FROM campagne_favoris cf
      JOIN user u ON cf.user_id = u.id
      WHERE cf.campagne_id = ?
      ORDER BY u.username ASC
    `;
    return query<{ id: number; username: string; avatar: string | null }>(sql, [campaignId]);
  }

  async isUserCampaignAlert(campaignId: number, userId: number): Promise<boolean> {
    const sql = `SELECT joueur_id FROM alert WHERE campagne_id = ? AND joueur_id = ?`;
    const row = await queryOne<{ joueur_id: number }>(sql, [campaignId, userId]);
    return Boolean(row);
  }

  async addCampaignAlert(campaignId: number, userId: number): Promise<void> {
    const sql = `INSERT IGNORE INTO alert (campagne_id, joueur_id) VALUES (?, ?)`;
    await execute(sql, [campaignId, userId]);
  }

  async removeCampaignAlert(campaignId: number, userId: number): Promise<void> {
    const sql = `DELETE FROM alert WHERE campagne_id = ? AND joueur_id = ?`;
    await execute(sql, [campaignId, userId]);
  }
}

export const campaignRepository: ICampaignRepository = new MysqlCampaignRepository();
