import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderDieSvg, parseDiceInText, parseDiceInHtml } from './dice-parser.js';

describe('Frontend Dice Parser', () => {
  it('doit générer un SVG valide pour un d8 avec le résultat 2', () => {
    const svg = renderDieSvg('d8', '2');
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('points="18,2 33,18 18,34 3,18"')); // Losange d8
    assert.ok(svg.includes('>2<'));
    assert.ok(svg.includes('aria-label="d8 ( 2 )"'));
  });

  it('doit générer un SVG pour les autres types de dés (d4, d6, d10, d12, d20, d100, du, df)', () => {
    const d4 = renderDieSvg('d4', 3);
    assert.ok(d4.includes('polygon points="18,3 33,31 3,31"'));
    assert.ok(d4.includes('>3<'));

    const d6 = renderDieSvg('d6', 5);
    assert.ok(d6.includes('<rect'));
    assert.ok(d6.includes('>5<'));

    const d10 = renderDieSvg('d10', 8);
    assert.ok(d10.includes('polygon points="18,2 33,12 28,32 8,32 3,12"'));
    assert.ok(d10.includes('>8<'));

    const d12 = renderDieSvg('d12', 11);
    assert.ok(d12.includes('>11<'));

    const d20 = renderDieSvg('d20', 20);
    assert.ok(d20.includes('>20<'));

    const du = renderDieSvg('du', 1);
    assert.ok(du.includes('>1<'));

    const dfPos = renderDieSvg('df', 1);
    assert.ok(dfPos.includes('>+<'));

    const dfNeg = renderDieSvg('df', -1);
    assert.ok(dfNeg.includes('>-<'));
  });

  it('parseDiceInText doit transformer d8 ( 2 ) en SVG', () => {
    const input = 'Résultat du jet : d8 ( 2 )';
    const output = parseDiceInText(input);
    assert.ok(output.includes('<svg'));
    assert.ok(output.includes('aria-label="d8 ( 2 )"'));
  });

  it('parseDiceInHtml doit remplacer les dés dans le texte tout en conservant les balises HTML intactes', () => {
    const html = '<div class="dice-roll-card"><span class="font-bold">d8 ( 2 )</span> + <code>d6 ( 5 )</code></div>';
    const parsed = parseDiceInHtml(html);

    assert.ok(parsed.includes('<div class="dice-roll-card">'));
    assert.ok(parsed.includes('<span class="font-bold">'));
    assert.ok(parsed.includes('<code>'));
    assert.ok(parsed.includes('aria-label="d8 ( 2 )"'));
    assert.ok(parsed.includes('aria-label="d6 ( 5 )"'));
  });

  it('gère les multiples dés et les expressions composées', () => {
    const text = 'd6 ( 2 ) + d6 ( 4 ) + d6 ( 6 ) = 12';
    const parsed = parseDiceInText(text);
    const svgCount = (parsed.match(/<svg/g) || []).length;
    assert.strictEqual(svgCount, 3);
  });
});
