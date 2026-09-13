import { query, queryOne, execute } from '../db/mysql.js';
import { CampaignSummary, RawCampaignCharacterRow, RawPnjCategoryRow, CampaignParticipant } from '../types/index.js';

export interface ICampaignRepository {
  findMasteredCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findPlayerCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findAllCampaigns(options?: { includeArchived?: boolean; search?: string }): Promise<CampaignSummary[]>;
  findById(id: number): Promise<CampaignSummary | null>;
  findCampaignCharacters(campaignId: number): Promise<RawCampaignCharacterRow[]>;
  findCampaignPnjCategories(campaignId: number): Promise<RawPnjCategoryRow[]>;
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
  findCampaignParticipants(campaignId: number): Promise<CampaignParticipant[]>;
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
        cc.link_sidebar_color AS linkSidebarColor
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      WHERE c.mj_id = ?
        ${archiveCondition}
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

    const rows = await query<RawCampaignRow>(sql, [userId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
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
        p.name AS characterName,
        p.avatar AS characterAvatar
      FROM campagne_participant cp
      JOIN campagne c ON cp.campagne_id = c.id
      JOIN user u ON c.mj_id = u.id
      LEFT JOIN campagne_config cc ON cc.campagne_id = c.id
      LEFT JOIN personnages p ON p.campagne_id = c.id AND p.user_id = cp.user_id
      WHERE cp.user_id = ?
        ${archiveCondition}
      ORDER BY c.id DESC
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
    }

    const rows = await query<RawPlayerCampaignRow>(sql, [userId]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      mjId: row.mjId,
      mjUsername: row.mjUsername,
      mjAvatar: row.mjAvatar || '',
      nbJoueurs: row.nbJoueurs,
      nbJoueursActuel: row.nbJoueursActuel,
      banniere: row.banniere || '',
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
    }));
  }

  async findAllCampaigns(options: { includeArchived?: boolean; search?: string } = {}): Promise<CampaignSummary[]> {
    const { includeArchived = false, search } = options;
    const conditions: string[] = [];
    const params: any[] = [];

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
        cc.link_sidebar_color AS linkSidebarColor
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
        cc.link_sidebar_color AS linkSidebarColor
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
    };
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
}

export const campaignRepository: ICampaignRepository = new MysqlCampaignRepository();
