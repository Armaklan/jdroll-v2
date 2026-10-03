import {
  SourceCampaign,
  SourceEspace,
  SourceSection,
  SourceGroupe,
  SourceTheme,
  SourcePost,
} from '../types.js';
import { queryOne, query } from '../db/mysql.js';

export interface IEspritJdrSource {
  getCampaign(campaignId: number): Promise<SourceCampaign | null>;
  getEspaces(campaignId: number): Promise<SourceEspace[]>;
  getSections(campaignId: number): Promise<SourceSection[]>;
  getGroupes(campaignId: number): Promise<SourceGroupe[]>;
  getThemes(campaignId: number): Promise<SourceTheme[]>;
  getPostsByTheme(themeId: number): Promise<SourcePost[]>;
}

interface CampaignRow {
  ID: number;
  nom: string;
  jeu_nom: string | null;
  annonce: string | null;
  statut_campagne_ID: number;
  inscription_PJ: number;
  nb_max_joueur: number;
}

interface EspaceRow {
  ID: number;
  campagne_ID: number;
  libelle: string;
  type: number;
  ordre: number;
}

interface SectionRow {
  ID: number;
  espace_campagne_ID: number;
  libelle: string;
  ordre: number;
}

interface GroupeRow {
  ID: number;
  titre: string;
  espace_campagne_ID: number | null;
  espace_section_ID: number | null;
  statut_groupe_ID: number;
  ordre: number;
}

interface ThemeRow {
  ID: number;
  groupe_campagne_ID: number;
  titre: string;
  statut_theme_ID: number;
  ordre: number;
}

interface PostRow {
  ID: number;
  theme_groupe_ID: number;
  contenu: string;
  date_creation: string;
}

export class MysqlEspritJdrSource implements IEspritJdrSource {
  async getCampaign(campaignId: number): Promise<SourceCampaign | null> {
    const row = await queryOne<CampaignRow>(
      `SELECT c.ID, c.nom, j.nom AS jeu_nom, c.annonce,
              c.statut_campagne_ID, c.inscription_PJ, c.nb_max_joueur
         FROM campagne c
         LEFT JOIN jeu j ON j.ID = c.jeu_ID
        WHERE c.ID = ?`,
      [campaignId]
    );
    if (!row) {
      return null;
    }
    return {
      id: row.ID,
      nom: row.nom,
      jeuNom: row.jeu_nom ?? '',
      annonce: row.annonce ?? '',
      statutCampagneId: row.statut_campagne_ID,
      inscriptionPJ: Boolean(row.inscription_PJ),
      nbMaxJoueur: row.nb_max_joueur,
    };
  }

  async getEspaces(campaignId: number): Promise<SourceEspace[]> {
    const rows = await query<EspaceRow>(
      `SELECT ID, campagne_ID, libelle, type, ordre
         FROM espace_campagne
        WHERE campagne_ID = ?
        ORDER BY ordre, ID`,
      [campaignId]
    );
    return rows.map((row) => ({
      id: row.ID,
      campagneId: row.campagne_ID,
      libelle: row.libelle,
      type: row.type,
      ordre: row.ordre,
    }));
  }

  async getSections(campaignId: number): Promise<SourceSection[]> {
    const rows = await query<SectionRow>(
      `SELECT es.ID, es.espace_campagne_ID, es.libelle, es.ordre
         FROM espace_section es
         JOIN espace_campagne e ON e.ID = es.espace_campagne_ID
        WHERE e.campagne_ID = ?
        ORDER BY es.ordre, es.ID`,
      [campaignId]
    );
    return rows.map((row) => ({
      id: row.ID,
      espaceId: row.espace_campagne_ID,
      libelle: row.libelle,
      ordre: row.ordre,
    }));
  }

  async getGroupes(campaignId: number): Promise<SourceGroupe[]> {
    const rows = await query<GroupeRow>(
      `SELECT ID, titre, espace_campagne_ID, espace_section_ID, statut_groupe_ID, ordre
         FROM groupe_campagne
        WHERE campagne_ID = ?
        ORDER BY ordre, ID`,
      [campaignId]
    );
    return rows.map((row) => ({
      id: row.ID,
      campagneId: campaignId,
      titre: row.titre,
      espaceId: row.espace_campagne_ID,
      sectionId: row.espace_section_ID,
      statutGroupeId: row.statut_groupe_ID,
      ordre: row.ordre,
    }));
  }

  async getThemes(campaignId: number): Promise<SourceTheme[]> {
    const rows = await query<ThemeRow>(
      `SELECT t.ID, t.groupe_campagne_ID, t.titre, t.statut_theme_ID, t.ordre
         FROM theme_groupe t
         JOIN groupe_campagne g ON g.ID = t.groupe_campagne_ID
        WHERE g.campagne_ID = ?
        ORDER BY t.ordre, t.ID`,
      [campaignId]
    );
    return rows.map((row) => ({
      id: row.ID,
      groupeId: row.groupe_campagne_ID,
      titre: row.titre,
      statutThemeId: row.statut_theme_ID,
      ordre: row.ordre,
    }));
  }

  async getPostsByTheme(themeId: number): Promise<SourcePost[]> {
    const rows = await query<PostRow>(
      `SELECT ID, theme_groupe_ID, contenu, date_creation
         FROM post_theme
        WHERE theme_groupe_ID = ?
        ORDER BY date_creation, ID`,
      [themeId]
    );
    return rows.map((row) => ({
      id: row.ID,
      themeId: row.theme_groupe_ID,
      contenu: row.contenu,
      dateCreation: row.date_creation,
    }));
  }
}

export const espritJdrSource = new MysqlEspritJdrSource();
