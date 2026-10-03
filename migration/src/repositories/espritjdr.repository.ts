import {
  SourceCampaign,
  SourceEspace,
  SourceSection,
  SourceGroupe,
  SourceTheme,
  SourcePost,
  SourceIntervenant,
  SourceHjPost,
} from '../types.js';
import { queryOne, query } from '../db/mysql.js';

export interface IEspritJdrSource {
  getCampaign(campaignId: number): Promise<SourceCampaign | null>;
  getEspaces(campaignId: number): Promise<SourceEspace[]>;
  getSections(campaignId: number): Promise<SourceSection[]>;
  getGroupes(campaignId: number): Promise<SourceGroupe[]>;
  getThemes(campaignId: number): Promise<SourceTheme[]>;
  getIntervenantsByCampaign(campaignId: number): Promise<SourceIntervenant[]>;
  getPostsByTheme(themeId: number): Promise<SourcePost[]>;
  getPostIdsByCampaign(campaignId: number): Promise<number[]>;
  getHjPostsByTheme(themeId: number): Promise<SourceHjPost[]>;
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
  intervenant_ID: number;
  contenu: string;
  date_creation: string;
}

interface HjPostRow {
  ID: number;
  post_theme_ID: number;
  intervenant_from: number;
  intervenant_from_nom: string;
  contenu: string;
  date_creation: string;
}

interface HjPostResponseRow {
  ID: number;
  hj_post_ID: number;
  intervenant_ID: number;
  intervenant_nom: string;
  contenu: string;
  date_creation: string;
}

interface IntervenantRow {
  ID: number;
  nom: string;
  description_publique: string | null;
  description_prive: string | null;
  image: string | null;
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

  async getIntervenantsByCampaign(campaignId: number): Promise<SourceIntervenant[]> {
    const rows = await query<IntervenantRow>(
      `SELECT i.ID, i.nom, ii.description_publique, ii.description_prive, ii.image
         FROM intervenant i
         LEFT JOIN infos_intervenant ii ON ii.intervenant_ID = i.ID
        WHERE i.campagne_ID = ?
          AND i.type_intervenant_ID IN (3, 4)
        ORDER BY i.ID`,
      [campaignId]
    );
    return rows.map((row) => ({
      id: row.ID,
      nom: row.nom,
      descriptionPublique: row.description_publique,
      descriptionPrivee: row.description_prive,
      image: row.image,
    }));
  }

  async getPostsByTheme(themeId: number): Promise<SourcePost[]> {
    const rows = await query<PostRow>(
      `SELECT ID, theme_groupe_ID, intervenant_ID, contenu, date_creation
         FROM post_theme
        WHERE theme_groupe_ID = ?
        ORDER BY date_creation, ID`,
      [themeId]
    );
    return rows.map((row) => ({
      id: row.ID,
      themeId: row.theme_groupe_ID,
      intervenantId: row.intervenant_ID,
      contenu: row.contenu,
      dateCreation: row.date_creation,
    }));
  }

  async getPostIdsByCampaign(campaignId: number): Promise<number[]> {
    const rows = await query<{ ID: number }>(
      `SELECT DISTINCT p.ID
         FROM post_theme p
         LEFT JOIN theme_groupe t ON t.ID = p.theme_groupe_ID
         LEFT JOIN groupe_campagne g ON g.ID = t.groupe_campagne_ID
        WHERE p.campagne_ID = ? OR g.campagne_ID = ?`,
      [campaignId, campaignId]
    );
    return rows.map((row) => row.ID);
  }

  async getHjPostsByTheme(themeId: number): Promise<SourceHjPost[]> {
    const posts = await query<HjPostRow>(
      `SELECT hj.ID, hj.post_theme_ID, hj.intervenant_from,
              i.nom AS intervenant_from_nom, hj.contenu, hj.date_creation
         FROM hj_post hj
         JOIN post_theme p ON p.ID = hj.post_theme_ID
         JOIN intervenant i ON i.ID = hj.intervenant_from
        WHERE p.theme_groupe_ID = ?
        ORDER BY hj.date_creation, hj.ID`,
      [themeId]
    );
    if (posts.length === 0) {
      return [];
    }

    const responses = await query<HjPostResponseRow>(
      `SELECT r.ID, r.hj_post_ID, r.intervenant_ID,
              i.nom AS intervenant_nom, r.contenu, r.date_creation
         FROM hj_post_reponse r
         JOIN hj_post hj ON hj.ID = r.hj_post_ID
         JOIN post_theme p ON p.ID = hj.post_theme_ID
         JOIN intervenant i ON i.ID = r.intervenant_ID
        WHERE p.theme_groupe_ID = ?
        ORDER BY r.date_creation, r.ID`,
      [themeId]
    );

    const responsesByHjPostId = new Map<number, SourceHjPost['reponses']>();
    for (const row of responses) {
      const list = responsesByHjPostId.get(row.hj_post_ID) ?? [];
      list.push({
        id: row.ID,
        hjPostId: row.hj_post_ID,
        intervenantId: row.intervenant_ID,
        intervenantNom: row.intervenant_nom,
        contenu: row.contenu,
        dateCreation: row.date_creation,
      });
      responsesByHjPostId.set(row.hj_post_ID, list);
    }

    return posts.map((row) => ({
      id: row.ID,
      postThemeId: row.post_theme_ID,
      intervenantFromId: row.intervenant_from,
      intervenantFromNom: row.intervenant_from_nom,
      contenu: row.contenu,
      dateCreation: row.date_creation,
      reponses: responsesByHjPostId.get(row.ID) ?? [],
    }));
  }
}

export const espritJdrSource = new MysqlEspritJdrSource();
