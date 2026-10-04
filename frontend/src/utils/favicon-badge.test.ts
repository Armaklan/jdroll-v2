import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBadgeLabel,
  buildBadgedFaviconSvg,
  toFaviconDataUrl,
  setFaviconBadgeCount,
  FaviconBadgeDeps,
} from './favicon-badge';

describe('getBadgeLabel', () => {
  it('retourne null pour 0 notification', () => {
    assert.equal(getBadgeLabel(0), null);
  });

  it('retourne null pour un nombre négatif ou invalide', () => {
    assert.equal(getBadgeLabel(-3), null);
    assert.equal(getBadgeLabel(NaN), null);
  });

  it('retourne le nombre tel quel en dessous de 100', () => {
    assert.equal(getBadgeLabel(1), '1');
    assert.equal(getBadgeLabel(42), '42');
    assert.equal(getBadgeLabel(99), '99');
  });

  it('retourne 99+ au-delà de 99', () => {
    assert.equal(getBadgeLabel(100), '99+');
    assert.equal(getBadgeLabel(1000), '99+');
  });
});

describe('buildBadgedFaviconSvg', () => {
  const originalSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16800 16800"><rect width="16800" height="16800" fill="blue"/></svg>';

  it('injecte un cercle et le libellé avant la balise fermante svg', () => {
    const result = buildBadgedFaviconSvg(originalSvg, '7');
    assert.ok(result.includes('<rect width="16800" height="16800" fill="blue"/>'));
    assert.ok(result.includes('<circle'));
    assert.ok(result.includes('7</text>'));
    assert.ok(result.endsWith('</svg>'));
    assert.ok(result.indexOf('<circle') < result.indexOf('</svg>'));
  });

  it('utilise un viewBox par défaut si le SVG n en a pas', () => {
    const noViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    const result = buildBadgedFaviconSvg(noViewBox, '3');
    assert.ok(result.includes('<circle'));
    assert.ok(result.includes('3</text>'));
  });

  it('dessine un badge assez gros et lisible en 16px', () => {
    const result = buildBadgedFaviconSvg(originalSvg, '7');
    const circle = result.match(/<circle[^>]*>/)?.[0] ?? '';
    const radius = Number(circle.match(/r="([\d.]+)"/)?.[1] ?? 0);
    const cx = Number(circle.match(/cx="([\d.]+)"/)?.[1] ?? 0);
    const cy = Number(circle.match(/cy="([\d.]+)"/)?.[1] ?? 0);
    const fontSize = Number(result.match(/font-size="([\d.]+)"/)?.[1] ?? 0);
    // viewBox 16800 : le rayon doit représenter au moins 32% du côté
    assert.ok(radius >= 16800 * 0.32, `rayon trop petit : ${radius}`);
    assert.ok(fontSize >= radius, `texte trop petit : ${fontSize}`);
    // Le badge est posé sur le dessus de l icône (moitié haute)
    assert.ok(cy < 16800 / 2, `badge trop bas : cy=${cy}`);
    assert.ok(cx > 16800 / 2, `badge trop à gauche : cx=${cx}`);
    // Fond bleu
    assert.ok(circle.includes('#2563eb'), `fond pas bleu : ${circle}`);
  });
});

describe('toFaviconDataUrl', () => {
  it('encode le SVG en data URL svg+xml', () => {
    const url = toFaviconDataUrl('<svg></svg>');
    assert.ok(url.startsWith('data:image/svg+xml,'));
    assert.ok(decodeURIComponent(url.replace('data:image/svg+xml,', '')).includes('<svg'));
  });
});

describe('setFaviconBadgeCount', () => {
  interface FakeLink {
    attrs: Record<string, string>;
    getAttribute(name: string): string | null;
    setAttribute(name: string, value: string): void;
  }

  function makeLink(href: string): FakeLink {
    const attrs: Record<string, string> = { rel: 'icon', href };
    return {
      attrs,
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
    };
  }

  function makeDeps(href: string, svgText: string) {
    const link = makeLink(href);
    const fetchedUrls: string[] = [];
    const deps: FaviconBadgeDeps = {
      document: {
        querySelector: (selector: string) =>
          selector === 'link[rel="icon"]' ? (link as unknown as FakeLink) : null,
      },
      fetchImpl: async (url: string) => {
        fetchedUrls.push(url);
        return { text: async () => svgText };
      },
    };
    return { link, deps, fetchedUrls };
  }

  it('pose un badge sur le link icon quand le compte est positif', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
    const { link, deps, fetchedUrls } = makeDeps('/jdroll-logo.svg', svg);

    await setFaviconBadgeCount(5, deps);

    assert.deepEqual(fetchedUrls, ['/jdroll-logo.svg']);
    assert.ok(link.attrs.href.startsWith('data:image/svg+xml,'));
    const decoded = decodeURIComponent(link.attrs.href.replace('data:image/svg+xml,', ''));
    assert.ok(decoded.includes('5</text>'));
  });

  it('restaure le href original quand le compte retombe à 0', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
    const { link, deps } = makeDeps('/jdroll-logo.svg', svg);

    await setFaviconBadgeCount(5, deps);
    await setFaviconBadgeCount(0, deps);

    assert.equal(link.attrs.href, '/jdroll-logo.svg');
  });

  it('ne fait rien s il n y a pas de link icon', async () => {
    const deps: FaviconBadgeDeps = {
      document: { querySelector: () => null },
      fetchImpl: async () => {
        throw new Error('ne doit pas être appelé');
      },
    };
    await setFaviconBadgeCount(5, deps);
  });

  it('laisse la favicon intacte si le fetch échoue', async () => {
    const { link, deps } = makeDeps('/jdroll-logo.svg', '<svg/>');
    (deps as { fetchImpl: (url: string) => Promise<{ text(): Promise<string> }> }).fetchImpl =
      async () => {
        throw new Error('network error');
      };

    await setFaviconBadgeCount(5, deps);

    assert.equal(link.attrs.href, '/jdroll-logo.svg');
  });
});
