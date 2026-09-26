import { query, queryOne } from '../db/mysql.js';

export interface ThemeDefinition {
  id: number;
  title: string;
  oddLineColor: string | null;
  evenLineColor: string | null;
  sidebarColor: string | null;
  linkColor: string | null;
  linkSidebarColor: string;
  textColor: string | null;
  dialogueColor: string | null;
  penseeColor: string | null;
  rp1Color: string | null;
  rp2Color: string | null;
  quoteColor: string | null;
}

export interface IThemeRepository {
  findAll(): Promise<ThemeDefinition[]>;
  findById(id: number): Promise<ThemeDefinition | null>;
}

const THEME_COLUMNS = `
  id,
  title,
  odd_line_color AS oddLineColor,
  even_line_color AS evenLineColor,
  sidebar_color AS sidebarColor,
  link_color AS linkColor,
  link_sidebar_color AS linkSidebarColor,
  text_color AS textColor,
  dialogue_color AS dialogueColor,
  pensee_color AS penseeColor,
  rp1_color AS rp1Color,
  rp2_color AS rp2Color,
  quote_color AS quoteColor
`;

export class MysqlThemeRepository implements IThemeRepository {
  async findAll(): Promise<ThemeDefinition[]> {
    return query<ThemeDefinition>(`SELECT ${THEME_COLUMNS} FROM theme ORDER BY title`);
  }

  async findById(id: number): Promise<ThemeDefinition | null> {
    return queryOne<ThemeDefinition>(`SELECT ${THEME_COLUMNS} FROM theme WHERE id = ?`, [id]);
  }
}

export const themeRepository = new MysqlThemeRepository();
