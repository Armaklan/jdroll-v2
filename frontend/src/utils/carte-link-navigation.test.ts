import { describe, it } from 'node:test';
import assert from 'node:assert';
import { handleCarteLinkClick } from './carte-link-navigation.js';

interface FakeEvent {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  prevented: boolean;
  preventDefault(): void;
}

function fakeEvent(overrides: Partial<FakeEvent> = {}): FakeEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    button: 0,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    ...overrides,
  };
}

describe('carte-link-navigation (clic sur un lien [carte])', () => {
  it('navigue en SPA au clic simple (même onglet)', () => {
    const e = fakeEvent();
    const navigated: string[] = [];
    handleCarteLinkClick(e, '/campaigns/1/cartes/2', (to) => navigated.push(to));
    assert.strictEqual(e.prevented, true);
    assert.deepStrictEqual(navigated, ['/campaigns/1/cartes/2']);
  });

  it('laisse le comportement natif pour ctrl/cmd/shift/alt+clic (nouvel onglet)', () => {
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) {
      const e = fakeEvent({ [modifier]: true } as Partial<FakeEvent>);
      const navigated: string[] = [];
      handleCarteLinkClick(e, '/campaigns/1/cartes/2', (to) => navigated.push(to));
      assert.strictEqual(e.prevented, false, `${modifier} ne doit pas être intercepté`);
      assert.strictEqual(navigated.length, 0, `${modifier} ne doit pas naviguer en SPA`);
    }
  });

  it('ne fait rien sans href valide', () => {
    const e = fakeEvent();
    const navigated: string[] = [];
    handleCarteLinkClick(e, null, (to) => navigated.push(to));
    handleCarteLinkClick(e, '', (to) => navigated.push(to));
    assert.strictEqual(e.prevented, false);
    assert.strictEqual(navigated.length, 0);
  });
});
