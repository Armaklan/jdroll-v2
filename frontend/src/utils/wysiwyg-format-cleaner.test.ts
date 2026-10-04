import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cleanFormatting } from './wysiwyg-format-cleaner.js';

describe('Wysiwyg format cleaner (bouton "Effacer le style")', () => {
  describe('Styles RP de l\'éditeur', () => {
    it('déroule un span hrp', () => {
      assert.strictEqual(cleanFormatting('<span class="hrp">Texte hrp</span>'), 'Texte hrp');
    });

    it('déroule un span dialogue', () => {
      assert.strictEqual(cleanFormatting('<span class="dialogue">Texte dialogue</span>'), 'Texte dialogue');
    });

    it('déroule les classes rp1, rp2 et pensee', () => {
      assert.strictEqual(cleanFormatting('<span class="rp1">A</span>'), 'A');
      assert.strictEqual(cleanFormatting('<span class="rp2">B</span>'), 'B');
      assert.strictEqual(cleanFormatting('<span class="pensee">C</span>'), 'C');
    });
  });

  describe('Styles issus d\'un copier-coller externe', () => {
    it('retire les styles inline sur un span', () => {
      assert.strictEqual(
        cleanFormatting('<span style="color: red; font-family: Arial;">Rouge</span>'),
        'Rouge'
      );
    });

    it('retire les classes CSS inconnues sur un paragraphe', () => {
      assert.strictEqual(
        cleanFormatting('<p class="MsoNormal">Texte</p>'),
        '<p>Texte</p>'
      );
    });

    it('retire les styles inline sur un paragraphe', () => {
      assert.strictEqual(
        cleanFormatting('<p style="text-align: center;">Centré</p>'),
        '<p>Centré</p>'
      );
    });

    it('déroule les balises font et la mise en forme inline', () => {
      assert.strictEqual(
        cleanFormatting('<font color="red" size="3">Texte</font>'),
        'Texte'
      );
      assert.strictEqual(cleanFormatting('<b>Gras</b>'), 'Gras');
      assert.strictEqual(cleanFormatting('<strong>Gras</strong>'), 'Gras');
      assert.strictEqual(cleanFormatting('<i>Italique</i>'), 'Italique');
      assert.strictEqual(cleanFormatting('<em>Italique</em>'), 'Italique');
      assert.strictEqual(cleanFormatting('<u>Souligné</u>'), 'Souligné');
      assert.strictEqual(cleanFormatting('<s>Barré</s>'), 'Barré');
      assert.strictEqual(cleanFormatting('<strike>Barré</strike>'), 'Barré');
      assert.strictEqual(cleanFormatting('<del>Barré</del>'), 'Barré');
      assert.strictEqual(cleanFormatting('<mark>Surligné</mark>'), 'Surligné');
      assert.strictEqual(cleanFormatting('<small>Petit</small>'), 'Petit');
      assert.strictEqual(cleanFormatting('<big>Grand</big>'), 'Grand');
      assert.strictEqual(cleanFormatting('<sub>Ind</sub>'), 'Ind');
      assert.strictEqual(cleanFormatting('<sup>Exp</sup>'), 'Exp');
      assert.strictEqual(cleanFormatting('<ins>Ins</ins>'), 'Ins');
    });

    it('gère les balises en majuscules (Word)', () => {
      assert.strictEqual(cleanFormatting('<B>Gras</B>'), 'Gras');
    });

    it('gère le contenu imbriqué RP + copier-coller', () => {
      const input = '<p><span class="dialogue"><b style="color: red;">Salut</b></span> tout le monde</p>';
      assert.strictEqual(cleanFormatting(input), '<p>Salut tout le monde</p>');
    });
  });

  describe('Ce qui doit être conservé', () => {
    it('conserve la structure de bloc (titres, paragraphes, citations, listes)', () => {
      const input =
        '<h1>Titre</h1><p>Texte</p><blockquote>Citation</blockquote><ul><li>Item</li></ul><ol><li>Num</li></ol>';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('conserve les sauts de ligne et lignes horizontales', () => {
      const input = '<p>Ligne 1</p><hr><p>Ligne 2</p><br>';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('conserve les liens et leurs attributs', () => {
      const input = '<a href="https://example.com" target="_blank">Lien</a>';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('conserve les images avec leurs classes et dimensions', () => {
      const input =
        '<img src="x.png" alt="Image" class="rounded-xl max-w-full" style="width: 100px; height: auto;">';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('conserve les tableaux wysiwyg et leur classe', () => {
      const input =
        '<table class="wysiwyg-table"><thead><tr><th>En-tête</th></tr></thead><tbody><tr><td>Cellule</td></tr></tbody></table>';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('conserve le texte brut et les balises BBCode', () => {
      const input = '<p>[hide]Secret[/hide] et [pnj=Bob]Bonjour[/pnj]</p>';
      assert.strictEqual(cleanFormatting(input), input);
    });

    it('retourne la valeur inchangée si elle est vide', () => {
      assert.strictEqual(cleanFormatting(''), '');
    });
  });
});
