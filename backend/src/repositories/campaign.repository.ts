import { query } from '../db/mysql.js';
import { CampaignSummary } from '../types/index.js';

export interface ICampaignRepository {
  findMasteredCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findPlayerCampaigns(userId: number, includeArchived?: boolean): Promise<CampaignSummary[]>;
  findAllCampaigns(options?: { includeArchived?: boolean; search?: string }): Promise<CampaignSummary[]>;
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
        c.rp
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
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
        p.name AS characterName,
        p.avatar AS characterAvatar
      FROM campagne_participant cp
      JOIN campagne c ON cp.campagne_id = c.id
      JOIN user u ON c.mj_id = u.id
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
        c.rp
      FROM campagne c
      JOIN user u ON c.mj_id = u.id
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
    }));
  }
}

export const campaignRepository: ICampaignRepository = new MysqlCampaignRepository();
