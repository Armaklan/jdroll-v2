import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  resolveTagInnerHtml,
  buildAdvancedTagHtml,
} from './wysiwyg-tag-builder.js';

describe('Wysiwyg tag builder (balises avancées [hide] / [private])', () => {
  describe('resolveTagInnerHtml : conservation du formatage', () => {
    it("réutilise le HTML de la sélection si le contenu n'a pas été modifié", () => {
      assert.strictEqual(
        resolveTagInnerHtml('du texte gras', '<b>du texte gras</b>', 'du texte gras'),
        '<b>du texte gras</b>'
      );
    });

    it('conserve un formatage multi-blocs (gras + code)', () => {
      assert.strictEqual(
        resolveTagInnerHtml('code', '<pre><code>code</code></pre>', 'code'),
        '<pre><code>code</code></pre>'
      );
    });

    it('retombe sur le texte brut si le contenu a été modifié dans la modale', () => {
      assert.strictEqual(
        resolveTagInnerHtml('du texte gras', '<b>du texte gras</b>', 'du texte édité'),
        'du texte édité'
      );
    });

    it('retombe sur le texte brut si aucune sélection formatée', () => {
      assert.strictEqual(resolveTagInnerHtml('texte', '', 'texte'), 'texte');
    });

    it('retombe sur le texte brut si le contenu saisi ne correspond pas au texte sélectionné', () => {
      assert.strictEqual(
        resolveTagInnerHtml('', '<b>rien</b>', 'contenu tapé'),
        'contenu tapé'
      );
    });

    it('échappe le contenu édité pour éviter une injection HTML', () => {
      assert.strictEqual(resolveTagInnerHtml('', '', 'a<b & c'), 'a&lt;b &amp; c');
    });
  });

  describe('buildAdvancedTagHtml : assemblage de la balise', () => {
    it('encapsule le HTML interne entre les balises ouvertes/fermantes', () => {
      assert.strictEqual(
        buildAdvancedTagHtml('[hide=Titre]', '<b>texte</b>', '[/hide]'),
        '[hide=Titre]<b>texte</b>[/hide]'
      );
    });

    it('échappe les caractères spéciaux HTML du paramètre de la balise', () => {
      assert.strictEqual(
        buildAdvancedTagHtml('[hide=<img src=x>]', 'texte', '[/hide]'),
        '[hide=&lt;img src=x&gt;]texte[/hide]'
      );
    });

    it('laisse le HTML interne intact (déjà validé par resolveTagInnerHtml)', () => {
      assert.strictEqual(
        buildAdvancedTagHtml('[hide]', '<b>gras</b>', '[/hide]'),
        '[hide]<b>gras</b>[/hide]'
      );
    });
  });
});
