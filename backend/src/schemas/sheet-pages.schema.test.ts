import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sheetPagesSchema,
  validateSheetPages,
  serializeSheetPages,
} from './sheet-pages.schema.js';

const validPages = {
  version: 1,
  pages: [
    {
      id: 'graphic-page-1',
      title: 'Identité',
      bgType: 'image',
      image: '/files/campagnes/1/feuille.png',
      html: '',
      templateFields: '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="2"></div>',
    },
    {
      id: 'graphic-page-2',
      title: 'Inventaire',
      bgType: 'html',
      html: '<table><tr><td>Objet</td></tr></table>',
      templateFields: '',
    },
  ],
};

describe('sheetPagesSchema', () => {
  it('valide une fiche graphique multi-pages', () => {
    const result = sheetPagesSchema.safeParse(validPages);
    assert.equal(result.success, true);
  });

  it('exige au moins une page', () => {
    const result = sheetPagesSchema.safeParse({ version: 1, pages: [] });
    assert.equal(result.success, false);
  });

  it('limite le nombre de pages à 20', () => {
    const pages = Array.from({ length: 21 }, (_, i) => ({
      id: `graphic-page-${i + 1}`,
      title: `Page ${i + 1}`,
      bgType: 'image',
      image: '',
      html: '',
      templateFields: '',
    }));
    const result = sheetPagesSchema.safeParse({ version: 1, pages });
    assert.equal(result.success, false);
  });

  it('rejette un type de fond inconnu', () => {
    const result = sheetPagesSchema.safeParse({
      version: 1,
      pages: [{ ...validPages.pages[0], bgType: 'video' }],
    });
    assert.equal(result.success, false);
  });

  it('rejette une page sans identifiant', () => {
    const result = sheetPagesSchema.safeParse({
      version: 1,
      pages: [{ ...validPages.pages[0], id: '' }],
    });
    assert.equal(result.success, false);
  });

  it('rejette les identifiants de page dupliqués', () => {
    const result = validateSheetPages({
      version: 1,
      pages: [validPages.pages[0], { ...validPages.pages[0], title: 'Doublon' }],
    });
    assert.equal(result.success, false);
  });

  it('rejette un titre trop long', () => {
    const result = sheetPagesSchema.safeParse({
      version: 1,
      pages: [{ ...validPages.pages[0], title: 'a'.repeat(201) }],
    });
    assert.equal(result.success, false);
  });

  it('rejette une version inconnue', () => {
    const result = sheetPagesSchema.safeParse({ ...validPages, version: 2 });
    assert.equal(result.success, false);
  });

  it('accepte une page sans image ni html (fond non configuré)', () => {
    const result = sheetPagesSchema.safeParse({
      version: 1,
      pages: [
        { id: 'p1', title: 'Page 1', bgType: 'image', templateFields: '' },
      ],
    });
    assert.equal(result.success, true);
  });
});

describe('serializeSheetPages', () => {
  it('sérialise puis revalide un document multi-pages', () => {
    const serialized = serializeSheetPages(validPages.pages);
    const roundTrip = validateSheetPages(JSON.parse(serialized));
    assert.equal(roundTrip.success, true);
    if (roundTrip.success) {
      assert.equal(roundTrip.data.pages.length, 2);
      assert.equal(roundTrip.data.pages[0].id, 'graphic-page-1');
      assert.equal(roundTrip.data.pages[1].bgType, 'html');
    }
  });
});
