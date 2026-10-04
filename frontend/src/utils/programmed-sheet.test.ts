import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_PAGE_WIDTH,
  FREE_ELEMENT_MIN_HEIGHT,
  FREE_ELEMENT_MIN_WIDTH,
  computeFreePlacement,
  computeFreeResize,
  duplicateSheetElement,
  fixedPageSize,
  freeChildStyle,
  nextFreePosition,
  assignFreePositions,
  pageBackgroundStyle,
  sectionBackgroundStyle,
} from './programmed-sheet.js';
import type { SheetComponent, SheetSection } from '../types/campaign.js';

describe('sectionBackgroundStyle', () => {
  it('retourne undefined quand aucune couleur de fond n’est définie', () => {
    assert.equal(sectionBackgroundStyle(undefined), undefined);
    assert.equal(sectionBackgroundStyle(null), undefined);
    assert.equal(sectionBackgroundStyle(''), undefined);
    assert.equal(sectionBackgroundStyle('   '), undefined);
  });

  it('retourne un style inline backgroundColor pour une couleur configurée', () => {
    assert.deepEqual(sectionBackgroundStyle('#fef3c7'), {
      backgroundColor: '#fef3c7',
    });
    assert.deepEqual(sectionBackgroundStyle('#123abc'), {
      backgroundColor: '#123abc',
    });
  });
});

describe('pageBackgroundStyle', () => {
  it('retourne undefined quand aucune image de fond n’est définie', () => {
    assert.equal(pageBackgroundStyle(undefined), undefined);
    assert.equal(pageBackgroundStyle(null), undefined);
    assert.equal(pageBackgroundStyle(''), undefined);
    assert.equal(pageBackgroundStyle('   '), undefined);
  });

  it('retourne un style de fond couvrant, centré, sans répétition', () => {
    assert.deepEqual(pageBackgroundStyle('/files/editor/1/abc.png'), {
      backgroundImage: 'url("/files/editor/1/abc.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    });
    assert.deepEqual(pageBackgroundStyle('https://example.com/fond.jpg'), {
      backgroundImage: 'url("https://example.com/fond.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    });
  });

  it('neutralise les guillemets doubles pour éviter toute injection CSS', () => {
    const style = pageBackgroundStyle('a"b.png');
    assert.equal(style?.backgroundImage, 'url("ab.png")');
  });
});

describe('positionnement libre (layout free)', () => {
  describe('freeChildStyle', () => {
    it('positionne l’élément en absolu, à l’origine par défaut', () => {
      assert.deepEqual(freeChildStyle(undefined), {
        position: 'absolute',
        top: 0,
        left: 0,
      });
    });

    it('applique la position enregistrée', () => {
      assert.deepEqual(freeChildStyle({ top: 120, left: 45 }), {
        position: 'absolute',
        top: 120,
        left: 45,
      });
    });

    it('applique la largeur redimensionnée quand elle est définie', () => {
      assert.deepEqual(freeChildStyle({ top: 10, left: 20 }, 320), {
        position: 'absolute',
        top: 10,
        left: 20,
        width: 320,
      });
    });
  });

  describe('computeFreeResize', () => {
    it('ajoute le déplacement du pointeur à la taille de départ', () => {
      assert.deepEqual(
        computeFreeResize({
          startWidth: 224,
          startHeight: 240,
          pointerDx: 100,
          pointerDy: 60,
        }),
        { width: 324, height: 300 }
      );
    });

    it('borne la taille au minimum', () => {
      assert.deepEqual(
        computeFreeResize({
          startWidth: 224,
          startHeight: 240,
          pointerDx: -400,
          pointerDy: -400,
        }),
        { width: FREE_ELEMENT_MIN_WIDTH, height: FREE_ELEMENT_MIN_HEIGHT }
      );
    });

    it('arrondit à l’entier', () => {
      const result = computeFreeResize({
        startWidth: 224,
        startHeight: 240,
        pointerDx: 10.6,
        pointerDy: -5.4,
      });
      assert.equal(result.width, 235);
      assert.equal(result.height, 235);
    });
  });

  describe('computeFreePlacement', () => {
    it('borne top et left à 0 minimum', () => {
      assert.deepEqual(
        computeFreePlacement({
          pointerTop: -20,
          pointerLeft: -30,
          itemWidth: 100,
          itemHeight: 40,
          currentHeight: 240,
        }),
        { top: 0, left: 0, height: 240 }
      );
    });

    it('conserve la hauteur du canevas si l’élément tient dedans', () => {
      assert.deepEqual(
        computeFreePlacement({
          pointerTop: 100,
          pointerLeft: 50,
          itemWidth: 100,
          itemHeight: 40,
          currentHeight: 240,
        }),
        { top: 100, left: 50, height: 240 }
      );
    });

    it('agrandit la hauteur pour contenir un élément déposé plus bas', () => {
      assert.deepEqual(
        computeFreePlacement({
          pointerTop: 300,
          pointerLeft: 10,
          itemWidth: 100,
          itemHeight: 40,
          currentHeight: 240,
        }),
        { top: 300, left: 10, height: 300 + 40 + 16 }
      );
    });

    it('plafonne la hauteur et la position quand la page est à taille fixe', () => {
      // Page fixe : le canevas ne peut pas dépasser maxHeight
      const result = computeFreePlacement({
        pointerTop: 500,
        pointerLeft: 700,
        itemWidth: 100,
        itemHeight: 40,
        currentHeight: 240,
        maxHeight: 400,
        maxWidth: 320,
      });
      // top borné pour que l'élément tienne (400 - 40 - 16)
      assert.equal(result.top, 400 - 40 - 16);
      // left borné pour que l'élément tienne en largeur (320 - 100 - 16)
      assert.equal(result.left, 320 - 100 - 16);
      assert.equal(result.height, 400);
    });

    it('plafonne la hauteur sans jamais dépasser maxHeight même si elle était plus grande', () => {
      const result = computeFreePlacement({
        pointerTop: 100,
        pointerLeft: 10,
        itemWidth: 100,
        itemHeight: 40,
        currentHeight: 600,
        maxHeight: 400,
      });
      assert.equal(result.height, 400);
    });
  });

  describe('fixedPageSize', () => {
    it('fixe la largeur à 800px et la hauteur au ratio de l’image', () => {
      assert.deepEqual(fixedPageSize(1600, 1200), {
        width: FIXED_PAGE_WIDTH,
        height: 600,
      });
      assert.deepEqual(fixedPageSize(400, 300), {
        width: FIXED_PAGE_WIDTH,
        height: 600,
      });
    });

    it('arrondit la hauteur à l’entier et garde au minimum 1px', () => {
      assert.deepEqual(fixedPageSize(1600, 1199), {
        width: FIXED_PAGE_WIDTH,
        height: Math.round((1199 * 800) / 1600),
      });
      assert.deepEqual(fixedPageSize(100000, 1), {
        width: FIXED_PAGE_WIDTH,
        height: 1,
      });
    });

    it('retombe sur un carré 800x800 pour des dimensions illisibles', () => {
      assert.deepEqual(fixedPageSize(0, 0), { width: FIXED_PAGE_WIDTH, height: FIXED_PAGE_WIDTH });
      assert.deepEqual(fixedPageSize(-10, 400), { width: FIXED_PAGE_WIDTH, height: FIXED_PAGE_WIDTH });
    });
  });

  describe('nextFreePosition', () => {
    it('place le premier enfant en haut à gauche du canevas', () => {
      assert.deepEqual(nextFreePosition([]), { top: 16, left: 16 });
    });

    it('place l’enfant sous l’élément le plus bas existant', () => {
      const children = [
        { id: 'a', position: { top: 16, left: 16 } },
        { id: 'b', position: { top: 300, left: 16 } },
        { id: 'c' },
      ];
      assert.deepEqual(nextFreePosition(children as never[]), {
        top: 300 + 64,
        left: 16,
      });
    });
  });

  describe('assignFreePositions', () => {
    it('attribue des positions empilées aux enfants sans position et conserve les existantes', () => {
      const children = [
        { id: 'a', label: 'A' },
        { id: 'b', position: { top: 200, left: 100 } },
        { id: 'c' },
      ];
      const result = assignFreePositions(children as never[]);
      assert.deepEqual(result[0].position, { top: 16, left: 16 });
      assert.deepEqual(result[1].position, { top: 200, left: 100 });
      assert.deepEqual(result[2].position, { top: 16 + 64, left: 16 });
    });
  });
});

describe('duplicateSheetElement', () => {
  it('duplique un composant avec un nouvel identifiant et les mêmes propriétés', () => {
    const component: SheetComponent = {
      id: 'comp-1',
      type: 'text',
      label: 'Nom',
      helpText: 'Texte d’aide',
      defaultValue: 'Inconnu',
      labelPosition: 'left',
    };
    const copy = duplicateSheetElement(component);
    assert.notEqual(copy.id, component.id);
    assert.match(copy.id, /^comp-/);
    assert.equal(copy.type, 'text');
    assert.equal(copy.label, 'Nom');
    assert.equal(copy.helpText, 'Texte d’aide');
    assert.equal(copy.defaultValue, 'Inconnu');
    assert.equal(copy.labelPosition, 'left');
  });

  it('duplique un composant sans partager les tableaux d’options avec l’original', () => {
    const component: SheetComponent = {
      id: 'comp-1',
      type: 'select',
      label: 'Classe',
      options: ['Guerrier', 'Mage'],
    };
    const copy = duplicateSheetElement(component);
    assert.deepEqual(copy.options, ['Guerrier', 'Mage']);
    assert.notEqual(copy.options, component.options);
  });

  it('duplique une section en régénérant les identifiants de tous ses descendants', () => {
    const innerComponent: SheetComponent = {
      id: 'comp-inner',
      type: 'text',
      label: 'Force',
    };
    const innerSection: SheetSection = {
      id: 'sec-inner',
      title: 'Caractéristiques',
      layout: 'vertical',
      children: [innerComponent],
    };
    const section: SheetSection = {
      id: 'sec-outer',
      title: 'Identité',
      layout: 'horizontal',
      borderWidth: 2,
      borderColor: '#dc2626',
      backgroundColor: '#fef3c7',
      children: [
        { id: 'comp-outer', type: 'text', label: 'Nom' },
        innerSection,
      ],
    };

    const copy = duplicateSheetElement(section);
    assert.notEqual(copy.id, section.id);
    assert.match(copy.id, /^sec-/);
    assert.equal(copy.title, 'Identité');
    assert.equal(copy.layout, 'horizontal');
    assert.equal(copy.borderWidth, 2);
    assert.equal(copy.borderColor, '#dc2626');
    assert.equal(copy.backgroundColor, '#fef3c7');
    assert.equal(copy.children.length, 2);

    const [copiedComponent, copiedInner] = copy.children;
    assert.equal(copiedComponent.type, 'text');
    assert.equal(copiedComponent.label, 'Nom');
    assert.notEqual(copiedComponent.id, 'comp-outer');

    assert.equal(isSection(copiedInner), true);
    assert.notEqual(copiedInner.id, 'sec-inner');
    assert.equal(copiedInner.title, 'Caractéristiques');
    assert.equal(copiedInner.children.length, 1);
    assert.notEqual(copiedInner.children[0].id, 'comp-inner');
  });

  it('préserve l’ordre des enfants et ne partage aucune référence avec l’original', () => {
    const section: SheetSection = {
      id: 'sec-1',
      title: 'S',
      layout: 'vertical',
      children: [
        { id: 'comp-a', type: 'text', label: 'A' },
        {
          id: 'sec-2',
          title: 'Enfant',
          layout: 'horizontal',
          children: [{ id: 'comp-b', type: 'number', label: 'B' }],
        },
      ],
    };
    const copy = duplicateSheetElement(section);
    assert.equal(copy.children[0].label, 'A');
    assert.equal(isSection(copy.children[1]), true);

    // Aucun id partagé entre l'arbre original et sa copie
    const collectIds = (el: unknown, acc: Set<string> = new Set()): Set<string> => {
      if (!el || typeof el !== 'object') return acc;
      const e = el as { id?: string; children?: unknown[] };
      if (e.id) acc.add(e.id);
      (e.children ?? []).forEach((child) => collectIds(child, acc));
      return acc;
    };
    const originalIds = collectIds(section);
    const copyIds = collectIds(copy);
    for (const id of originalIds) {
      assert.equal(copyIds.has(id), false, `id dupliqué : ${id}`);
    }
  });
});

function isSection(element: unknown): boolean {
  return Boolean(element && typeof element === 'object' && 'layout' in element);
}
