import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sheetDefinitionSchema,
  validateSheetDefinition,
  resolveSheetMode,
} from './sheet-definition.schema.js';

const validDefinition = {
  version: 1,
  pages: [
    {
      id: 'page-1',
      title: 'Identité',
      sections: [
        {
          id: 'sec-identite',
          title: 'État civil',
          layout: 'horizontal',
          components: [
            { id: 'comp-nom', type: 'text', label: 'Nom' },
            { id: 'comp-age', type: 'number', label: 'Âge', defaultValue: 0 },
            {
              id: 'comp-classe',
              type: 'select',
              label: 'Classe',
              options: ['Guerrier', 'Mage'],
            },
            { id: 'comp-sexe', type: 'radio', label: 'Sexe', options: ['F', 'M'] },
            {
              id: 'comp-bio',
              type: 'textarea',
              label: 'Biographie',
            },
            { id: 'comp-force', type: 'scoring', label: 'Force', max: 5 },
            { id: 'comp-titre', type: 'label', label: 'Titre affiché' },
          ],
          sections: [
            {
              id: 'sec-sous',
              title: 'Sous-section',
              layout: 'vertical',
              components: [{ id: 'comp-sous', type: 'text', label: 'Détail' }],
              sections: [],
            },
          ],
        },
      ],
    },
  ],
};

describe('sheetDefinitionSchema', () => {
  it('valide une définition complète et récursive', () => {
    const result = sheetDefinitionSchema.safeParse(validDefinition);
    assert.equal(result.success, true);
  });

  it('rejette un layout inconnu', () => {
    const result = sheetDefinitionSchema.safeParse({
      ...validDefinition,
      pages: [
        {
          ...validDefinition.pages[0],
          sections: [
            {
              ...validDefinition.pages[0].sections[0],
              layout: 'diagonal',
            },
          ],
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it('rejette un type de composant inconnu', () => {
    const result = sheetDefinitionSchema.safeParse({
      ...validDefinition,
      pages: [
        {
          ...validDefinition.pages[0],
          sections: [
            {
              ...validDefinition.pages[0].sections[0],
              components: [{ id: 'x', type: 'gauge', label: 'X' }],
            },
          ],
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it('exige des options pour un composant select et radio', () => {
    const noOptions = {
      ...validDefinition,
      pages: [
        {
          ...validDefinition.pages[0],
          sections: [
            {
              ...validDefinition.pages[0].sections[0],
              components: [
                { id: 'x', type: 'select', label: 'X' },
              ],
            },
          ],
        },
      ],
    };
    assert.equal(sheetDefinitionSchema.safeParse(noOptions).success, false);

    const emptyOptions = {
      ...validDefinition,
      pages: [
        {
          ...validDefinition.pages[0],
          sections: [
            {
              ...validDefinition.pages[0].sections[0],
              components: [
                { id: 'x', type: 'radio', label: 'X', options: [] },
              ],
            },
          ],
        },
      ],
    };
    assert.equal(sheetDefinitionSchema.safeParse(emptyOptions).success, false);
  });

  it('exige un maximum de points pour un composant scoring', () => {
    const result = sheetDefinitionSchema.safeParse({
      ...validDefinition,
      pages: [
        {
          ...validDefinition.pages[0],
          sections: [
            {
              ...validDefinition.pages[0].sections[0],
              components: [{ id: 'x', type: 'scoring', label: 'X' }],
            },
          ],
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it('rejette les identifiants dupliqués', () => {
    const result = validateSheetDefinition({
      ...validDefinition,
      pages: [
        ...validDefinition.pages,
        {
          id: 'page-1',
          title: 'Doublon',
          sections: [
            {
              id: 'sec-identite',
              title: 'Doublon',
              layout: 'vertical',
              components: [{ id: 'comp-nom', type: 'text', label: 'Nom' }],
              sections: [],
            },
          ],
        },
      ],
    });
    assert.equal(result.success, false);
  });

  it('rejette une page sans identifiant', () => {
    const result = sheetDefinitionSchema.safeParse({
      ...validDefinition,
      pages: [{ title: 'Sans id', sections: [] }],
    });
    assert.equal(result.success, false);
  });
});

describe('resolveSheetMode', () => {
  it("dérive 'graphic' quand un template graphique existe et aucun mode n'est défini", () => {
    assert.equal(
      resolveSheetMode({ templateHtml: '<img src="x">', templateImg: null, templateFields: null }),
      'graphic'
    );
    assert.equal(
      resolveSheetMode({ templateHtml: null, templateImg: null, templateFields: 'html' }),
      'graphic'
    );
  });

  it("dérive 'technical' quand aucun template n'existe", () => {
    assert.equal(resolveSheetMode({}), 'technical');
    assert.equal(
      resolveSheetMode({ templateHtml: null, templateImg: null, templateFields: null }),
      'technical'
    );
  });

  it('respecte le mode explicite stocké en base', () => {
    assert.equal(resolveSheetMode({ sheetMode: 'programmed' }), 'programmed');
    assert.equal(resolveSheetMode({ sheetMode: 'technical', templateImg: 'x.png' }), 'technical');
    assert.equal(resolveSheetMode({ sheetMode: 'graphic' }), 'graphic');
  });

  it("retombe sur la dérivation si le mode stocké est inconnu", () => {
    assert.equal(resolveSheetMode({ sheetMode: 'banana', templateImg: 'x.png' }), 'graphic');
    assert.equal(resolveSheetMode({ sheetMode: 'banana' }), 'technical');
  });
});

describe('sheetDefinitionSchema - position du libellé et bordure de section', () => {
  it("accepte labelPosition 'above' et 'left' sur un composant", () => {
    const above = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{
          id: 's', layout: 'vertical', components: [{ id: 'c', type: 'text', label: 'L', labelPosition: 'above' }], sections: [],
        }],
      }],
    });
    assert.equal(above.success, true);

    const left = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{
          id: 's', layout: 'vertical', components: [{ id: 'c', type: 'text', label: 'L', labelPosition: 'left' }], sections: [],
        }],
      }],
    });
    assert.equal(left.success, true);
  });

  it('rejette une position de libellé inconnue', () => {
    const result = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{
          id: 's', layout: 'vertical', components: [{ id: 'c', type: 'text', label: 'L', labelPosition: 'underneath' }], sections: [],
        }],
      }],
    });
    assert.equal(result.success, false);
  });

  it('accepte une bordure de section (épaisseur et couleur)', () => {
    const result = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{
          id: 's', layout: 'vertical', borderWidth: 3, borderColor: '#dc2626', components: [], sections: [],
        }],
      }],
    });
    assert.equal(result.success, true);
  });

  it('rejette une épaisseur de bordure hors bornes ou une couleur invalide', () => {
    const tooThick = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{ id: 's', layout: 'vertical', borderWidth: 11, components: [], sections: [] }],
      }],
    });
    assert.equal(tooThick.success, false);

    const negative = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{ id: 's', layout: 'vertical', borderWidth: -1, components: [], sections: [] }],
      }],
    });
    assert.equal(negative.success, false);

    const badColor = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'p', title: 'P',
        sections: [{ id: 's', layout: 'vertical', borderWidth: 2, borderColor: 'rouge', components: [], sections: [] }],
      }],
    });
    assert.equal(badColor.success, false);
  });
});

describe('sheetDefinitionSchema - enfants unifiés (children) dans une section', () => {
  it('accepte des composants et sous-sections mélangés dans children', () => {
    const result = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'page-1',
        title: 'P',
        sections: [{
          id: 'sec-1',
          layout: 'horizontal',
          children: [
            { id: 'comp-a', type: 'text', label: 'A' },
            { id: 'sec-2', layout: 'vertical', children: [{ id: 'comp-b', type: 'number', label: 'B' }] },
            { id: 'comp-c', type: 'text', label: 'C' },
          ],
        }],
      }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      const children = (result.data.pages[0].sections[0] as any).children;
      assert.equal(children.length, 3);
      assert.equal(children[0].id, 'comp-a');
      assert.equal(children[1].id, 'sec-2');
      assert.equal(children[2].id, 'comp-c');
    }
  });

  it('normalise le format historique (components + sections) vers children', () => {
    const result = validateSheetDefinition({
      version: 1,
      pages: [{
        id: 'page-1',
        title: 'P',
        sections: [{
          id: 'sec-1',
          layout: 'vertical',
          components: [
            { id: 'comp-a', type: 'text', label: 'A' },
            { id: 'comp-b', type: 'number', label: 'B' },
          ],
          sections: [
            { id: 'sec-2', layout: 'vertical', components: [{ id: 'comp-c', type: 'text', label: 'C' }], sections: [] },
          ],
        }],
      }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      const section = result.data.pages[0].sections[0] as any;
      assert.ok(Array.isArray(section.children));
      assert.equal(section.children.length, 3);
      assert.equal(section.children[0].id, 'comp-a');
      assert.equal(section.children[1].id, 'comp-b');
      assert.equal(section.children[2].id, 'sec-2');
      // La sous-section héritée est également normalisée
      assert.ok(Array.isArray(section.children[2].children));
      assert.equal(section.children[2].children[0].id, 'comp-c');
    }
  });

  it('rejette un enfant qui n’est ni un composant ni une section', () => {
    const result = sheetDefinitionSchema.safeParse({
      version: 1,
      pages: [{
        id: 'page-1',
        title: 'P',
        sections: [{ id: 'sec-1', layout: 'vertical', children: [{ id: 'x', mystere: true }] }],
      }],
    });
    assert.equal(result.success, false);
  });
});
