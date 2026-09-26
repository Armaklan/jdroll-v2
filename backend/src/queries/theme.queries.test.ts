import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ThemeQueries } from './theme.queries.js';
import { IThemeRepository, ThemeDefinition } from '../repositories/theme.repository.js';

describe('ThemeQueries', () => {
  let queries: ThemeQueries;
  let mockThemeRepo: Partial<IThemeRepository>;

  const mockThemes: ThemeDefinition[] = [
    {
      id: 1,
      title: 'Médiéval',
      oddLineColor: '#f5f5f5',
      evenLineColor: '#e0e0e0',
      sidebarColor: '#dcdcdc',
      linkColor: '#8b4513',
      linkSidebarColor: '#4a235a',
      textColor: '#2c2c2c',
      dialogueColor: '#1a5276',
      penseeColor: '#5b2c6f',
      rp1Color: '#7d6608',
      rp2Color: '#6e2c00',
      quoteColor: '#555555',
    },
    {
      id: 2,
      title: 'Cyberpunk',
      oddLineColor: '#0d0d0d',
      evenLineColor: '#1a1a1a',
      sidebarColor: '#000000',
      linkColor: '#00fff0',
      linkSidebarColor: '#ff00ff',
      textColor: '#e0e0e0',
      dialogueColor: '#00ff00',
      penseeColor: '#ff0040',
      rp1Color: '#ffee00',
      rp2Color: '#00aaff',
      quoteColor: '#888888',
    },
  ];

  beforeEach(() => {
    mockThemeRepo = {
      findAll: async () => mockThemes,
    };
    queries = new ThemeQueries(mockThemeRepo as IThemeRepository);
  });

  it('should return all predefined themes', async () => {
    const result = await queries.getAllThemes();

    assert.equal(result.length, 2);
    assert.equal(result[0].id, 1);
    assert.equal(result[0].title, 'Médiéval');
    assert.equal(result[1].id, 2);
    assert.equal(result[1].title, 'Cyberpunk');
  });

  it('should return themes with their color definitions', async () => {
    const result = await queries.getAllThemes();

    assert.equal(result[0].dialogueColor, '#1a5276');
    assert.equal(result[0].penseeColor, '#5b2c6f');
    assert.equal(result[0].rp1Color, '#7d6608');
    assert.equal(result[0].rp2Color, '#6e2c00');
    assert.equal(result[0].quoteColor, '#555555');
    assert.equal(result[0].sidebarColor, '#dcdcdc');
    assert.equal(result[0].oddLineColor, '#f5f5f5');
    assert.equal(result[0].evenLineColor, '#e0e0e0');
    assert.equal(result[0].textColor, '#2c2c2c');
    assert.equal(result[0].linkColor, '#8b4513');
    assert.equal(result[0].linkSidebarColor, '#4a235a');
  });

  it('should return empty list when no theme exists', async () => {
    mockThemeRepo = {
      findAll: async () => [],
    };
    queries = new ThemeQueries(mockThemeRepo as IThemeRepository);

    const result = await queries.getAllThemes();

    assert.deepEqual(result, []);
  });
});
