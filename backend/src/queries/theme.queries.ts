import { IThemeRepository, themeRepository, ThemeDefinition } from '../repositories/theme.repository.js';

export class ThemeQueries {
  constructor(private readonly themeRepo: IThemeRepository = themeRepository) {}

  /**
   * Récupère la liste des thèmes pré-conçus disponibles pour les campagnes
   */
  async getAllThemes(): Promise<ThemeDefinition[]> {
    return this.themeRepo.findAll();
  }
}

export const themeQueries = new ThemeQueries();
