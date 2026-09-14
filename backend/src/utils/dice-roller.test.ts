import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  evaluateDiceFormula,
  generateDicePostContent,
  rollStandardDie,
  rollUbiquityDie,
  rollFudgeDie,
} from './dice-roller.js';

describe('Dice Roller Engine', () => {
  // Helper RNG déterministe basé sur une liste de valeurs fixes (entre 0 et 0.99999)
  function createSequenceRng(sequence: number[]) {
    let index = 0;
    return () => {
      const val = sequence[index % sequence.length];
      index++;
      return val;
    };
  }

  describe('Fonctions de tirage de base', () => {
    it('rollStandardDie doit retourner des valeurs entre 1 et N', () => {
      // Pour un d6 :
      // rng = 0 -> Math.floor(0 * 6) + 1 = 1
      // rng = 0.5 -> Math.floor(0.5 * 6) + 1 = 4
      // rng = 0.999 -> Math.floor(0.999 * 6) + 1 = 6
      assert.strictEqual(rollStandardDie(6, () => 0), 1);
      assert.strictEqual(rollStandardDie(6, () => 0.5), 4);
      assert.strictEqual(rollStandardDie(6, () => 0.999), 6);
    });

    it('rollUbiquityDie doit retourner 0 ou 1 avec 50% de probabilité', () => {
      assert.strictEqual(rollUbiquityDie(() => 0), 0);
      assert.strictEqual(rollUbiquityDie(() => 0.49), 0);
      assert.strictEqual(rollUbiquityDie(() => 0.5), 1);
      assert.strictEqual(rollUbiquityDie(() => 0.999), 1);
    });

    it('rollFudgeDie doit retourner -1, 0 ou +1', () => {
      // 0..0.333 -> -1
      // 0.334..0.666 -> 0
      // 0.667..0.999 -> +1
      assert.strictEqual(rollFudgeDie(() => 0.1), -1);
      assert.strictEqual(rollFudgeDie(() => 0.5), 0);
      assert.strictEqual(rollFudgeDie(() => 0.9), 1);
    });
  });

  describe('Syntaxes de formules', () => {
    it('3d6 : Lance 3 dés à 6 faces', () => {
      // séquence -> 2, 4, 6 (valeurs d6)
      // rngs: 1/6 (0.2), 3/6 (0.55), 5/6 (0.9) => 2, 4, 6 => total 12
      const rng = createSequenceRng([0.2, 0.55, 0.9]);
      const res = evaluateDiceFormula('3d6', 'Test 3d6', rng);

      assert.strictEqual(res.total, 12);
      assert.strictEqual(res.terms.length, 1);
      assert.deepStrictEqual(
        res.terms[0].dice.map((d) => d.value),
        [2, 4, 6]
      );
    });

    it('3du : Lance 3 dés ubiquity', () => {
      // 3 dés ubiquity : 0, 1, 1 => total 2
      const rng = createSequenceRng([0.1, 0.7, 0.8]);
      const res = evaluateDiceFormula('3du', 'Test Ubiquity', rng);

      assert.strictEqual(res.total, 2);
      assert.deepStrictEqual(
        res.terms[0].dice.map((d) => d.value),
        [0, 1, 1]
      );
    });

    it('4df : Lance 4 dés fudge', () => {
      // 4 dés fudge : -1, 0, +1, +1 => total 1
      const rng = createSequenceRng([0.1, 0.5, 0.8, 0.9]);
      const res = evaluateDiceFormula('4df', 'Test Fudge', rng);

      assert.strictEqual(res.total, 1);
      assert.deepStrictEqual(
        res.terms[0].dice.map((d) => d.value),
        [-1, 0, 1, 1]
      );
    });

    it('3d6 + 3 : Lance 3 dés à 6 faces et ajoute 3', () => {
      // 3d6 (2, 4, 6 -> 12) + 3 = 15
      const rng = createSequenceRng([0.2, 0.55, 0.9]);
      const res = evaluateDiceFormula('3d6 + 3', 'Test 3d6+3', rng);

      assert.strictEqual(res.total, 15);
      assert.strictEqual(res.terms.length, 2);
      assert.strictEqual(res.terms[0].subtotal, 12);
      assert.strictEqual(res.terms[1].subtotal, 3);
    });

    it('1d8 + 2d10 : Lance 1 dé à 8 faces et 2 dés à 10 faces, puis les ajoute', () => {
      // 1d8 (rng 0.5 -> 5), 2d10 (rng 0.3 -> 4, rng 0.8 -> 9) => 5 + 13 = 18
      const rng = createSequenceRng([0.5, 0.35, 0.85]);
      const res = evaluateDiceFormula('1d8 + 2d10', 'Test multi-dice', rng);

      assert.strictEqual(res.total, 18);
      assert.strictEqual(res.terms.length, 2);
      assert.strictEqual(res.terms[0].subtotal, 5);
      assert.strictEqual(res.terms[1].subtotal, 13);
    });

    it('3d8g2 : Lance 3 dés à 8 faces et conserve les deux meilleurs (g comme great)', () => {
      // Tirages 1d8 : 3, 8, 5 -> meilleurs 2 : 8 et 5 -> subtotal 13
      // rng: 0.3 (3), 0.95 (8), 0.55 (5)
      const rng = createSequenceRng([0.3, 0.95, 0.55]);
      const res = evaluateDiceFormula('3d8g2', 'Test great', rng);

      assert.strictEqual(res.total, 13);
      assert.strictEqual(res.terms[0].dice.length, 3);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [8, 5]
      );
    });

    it('3d8l2 : Lance 3 dés à 8 faces et conserve les deux moins bons (l comme less)', () => {
      // Tirages 1d8 : 3, 8, 5 -> moins bons 2 : 3 et 5 -> subtotal 8
      const rng = createSequenceRng([0.3, 0.95, 0.55]);
      const res = evaluateDiceFormula('3d8l2', 'Test less', rng);

      assert.strictEqual(res.total, 8);
      assert.strictEqual(res.terms[0].dice.length, 3);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [3, 5]
      );
    });

    it('(1d8 + 2d6)g1 : Lance 1 dé à 8 faces et 2 dés à 6 faces, puis conserve le meilleur', () => {
      // 1d8 (rng 0.3 -> 3), 2d6 (rng 0.9 -> 6, rng 0.5 -> 4) => pool: [3, 6, 4] -> meilleur 1 : 6
      const rng = createSequenceRng([0.3, 0.9, 0.55]);
      const res = evaluateDiceFormula('(1d8 + 2d6)g1', 'Test group great', rng);

      assert.strictEqual(res.total, 6);
      assert.strictEqual(res.terms[0].dice.length, 3);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [6]
      );
    });

    it('(1d8 + 2d6)l1 : Conserve le pire dé du groupe', () => {
      // pool: [3, 6, 4] -> pire 1 : 3
      const rng = createSequenceRng([0.3, 0.9, 0.55]);
      const res = evaluateDiceFormula('(1d8 + 2d6)l1', 'Test group less', rng);

      assert.strictEqual(res.total, 3);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [3]
      );
    });

    it('3d10>7 : Lance 3 dés à 10 faces et comptabilise les résultats supérieurs à 7', () => {
      // 3d10 avec tirages : 3, 8, 10 -> >7 correspond à 8 et 10 -> 2 succès
      // rng: 0.25 (3), 0.75 (8), 0.95 (10)
      const rng = createSequenceRng([0.25, 0.75, 0.95]);
      const res = evaluateDiceFormula('3d10>7', 'Test threshold >', rng);

      assert.strictEqual(res.total, 2);
      assert.strictEqual(res.isSuccessCount, true);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [8, 10]
      );
    });

    it('3d10<7 : Lance 3 dés à 10 faces et comptabilise les résultats inférieurs à 7', () => {
      // 3d10 avec tirages : 3, 8, 10 -> <7 correspond à 3 -> 1 succès
      const rng = createSequenceRng([0.25, 0.75, 0.95]);
      const res = evaluateDiceFormula('3d10<7', 'Test threshold <', rng);

      assert.strictEqual(res.total, 1);
      assert.strictEqual(res.isSuccessCount, true);
      assert.deepStrictEqual(
        res.terms[0].keptDice?.map((d) => d.value),
        [3]
      );
    });

    it('Gère les soustractions et combinaisons : 3d6 - 2 + 1d4', () => {
      // 3d6 (4, 4, 4 -> 12) - 2 + 1d4 (3) = 13
      const rng = createSequenceRng([0.55, 0.55, 0.55, 0.6]);
      const res = evaluateDiceFormula('3d6 - 2 + 1d4', 'Test soustraction', rng);

      assert.strictEqual(res.total, 13);
    });

    it('Rejette une formule vide ou invalide', () => {
      assert.throws(() => evaluateDiceFormula(''), /ne peut pas être vide/);
      assert.throws(() => evaluateDiceFormula('   '), /ne peut pas être vide/);
      assert.throws(() => evaluateDiceFormula('invalid_dice_string'), /Syntaxe de dé non reconnue/);
      assert.throws(() => evaluateDiceFormula('200d6'), /nombre de dés doit être compris entre 1 et 100/);
    });
  });

  describe('Génération du contenu HTML du post', () => {
    it('formate les dés sous la forme standard de compatibilité d8 ( 2 )', () => {
      // 1d8 avec résultat 2
      const rng1 = createSequenceRng([0.15]); // 0.15 * 8 = 1.2 -> + 1 = 2
      const res1 = evaluateDiceFormula('1d8', 'Test d8', rng1);
      assert.strictEqual(res1.summaryText, 'd8 ( 2 ) = 2');
      assert.ok(res1.detailsHtml.includes('d8 ( 2 )'));

      // 3d6 avec résultats 2, 4, 6
      const rng2 = createSequenceRng([0.2, 0.55, 0.9]);
      const res2 = evaluateDiceFormula('3d6', 'Test 3d6', rng2);
      assert.strictEqual(res2.summaryText, 'd6 ( 2 ) + d6 ( 4 ) + d6 ( 6 ) = 12');

      // 3du avec résultats 0, 1, 1
      const rng3 = createSequenceRng([0.1, 0.7, 0.8]);
      const res3 = evaluateDiceFormula('3du', 'Test 3du', rng3);
      assert.strictEqual(res3.summaryText, 'du ( 0 ) + du ( 1 ) + du ( 1 ) = 2');

      // 4df avec résultats -1, 0, 1, 1
      const rng4 = createSequenceRng([0.1, 0.5, 0.8, 0.9]);
      const res4 = evaluateDiceFormula('4df', 'Test 4df', rng4);
      assert.strictEqual(res4.summaryText, 'df ( -1 ) + df ( 0 ) + df ( 1 ) + df ( 1 ) = 1');
    });

    it('génère un contenu HTML propre avec la formule, la description et les résultats', () => {
      const rng = createSequenceRng([0.2, 0.55, 0.9]);
      const evaluation = evaluateDiceFormula('3d6 + 3', 'Attaque à la hache', rng);
      const html = generateDicePostContent(evaluation, 'Attaque à la hache');

      assert.ok(html.includes('Attaque à la hache'));
      assert.ok(html.includes('3d6 + 3'));
      assert.ok(html.includes('15'));
      assert.ok(html.includes('dice-roll-card'));
    });

    it('échappe les caractères HTML dangereux dans la description', () => {
      const rng = createSequenceRng([0.5]);
      const evaluation = evaluateDiceFormula('1d6', '<script>alert("xss")</script>', rng);
      const html = generateDicePostContent(evaluation, '<script>alert("xss")</script>');

      assert.ok(!html.includes('<script>'));
      assert.ok(html.includes('&lt;script&gt;'));
    });
  });
});
