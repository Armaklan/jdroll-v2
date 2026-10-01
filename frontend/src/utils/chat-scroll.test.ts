import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isNearBottom, SCROLL_BOTTOM_THRESHOLD_PX } from './chat-scroll.ts';

describe('Chat scroll utils (scroll auto vers le bas)', () => {
  describe('isNearBottom', () => {
    it('doit considérer être en bas quand la distance restante est sous le seuil', () => {
      // scrollHeight=1000, clientHeight=400 -> max scrollTop=600
      assert.ok(isNearBottom(590, 1000, 400) === true); // 10px du bas
      assert.ok(isNearBottom(600, 1000, 400) === true); // exactement en bas
    });

    it('doit considérer être en bas au-delà du bas (overscroll élastique négatif)', () => {
      assert.ok(isNearBottom(605, 1000, 400) === true); // distance négative
    });

    it('doit considérer ne pas être en bas quand on a scrollé vers le haut au-delà du seuil', () => {
      assert.ok(isNearBottom(500, 1000, 400) === false); // 100px du bas
      assert.ok(isNearBottom(0, 1000, 400) === false); // tout en haut
    });

    it('doit respecter le seuil par défaut fourni', () => {
      assert.ok(typeof SCROLL_BOTTOM_THRESHOLD_PX === 'number');
      assert.ok(SCROLL_BOTTOM_THRESHOLD_PX > 0);
      // Juste au seuil -> en bas ; 1px au-dessus du seuil -> pas en bas
      assert.ok(isNearBottom(600 - SCROLL_BOTTOM_THRESHOLD_PX, 1000, 400) === true);
      assert.ok(isNearBottom(600 - SCROLL_BOTTOM_THRESHOLD_PX - 1, 1000, 400) === false);
    });

    it('doit considérer être en bas quand le contenu ne remplit pas le conteneur', () => {
      // scrollHeight <= clientHeight : rien à scroller, on est "en bas"
      assert.ok(isNearBottom(0, 300, 400) === true);
    });

    it('doit accepter un seuil personnalisé', () => {
      assert.ok(isNearBottom(580, 1000, 400, 50) === true); // 20px du bas
      assert.ok(isNearBottom(580, 1000, 400, 10) === false); // 20px > seuil 10
    });
  });
});
