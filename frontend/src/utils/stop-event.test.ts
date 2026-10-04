import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stopEvent } from './stop-event';

describe('stopEvent', () => {
  it('stoppe la propagation de l événement', () => {
    let stopped = false;
    stopEvent({ stopPropagation: () => { stopped = true; }, preventDefault: () => {} });
    assert.ok(stopped);
  });

  it('annule le comportement par défaut (navigation du parent)', () => {
    let prevented = false;
    stopEvent({ stopPropagation: () => {}, preventDefault: () => { prevented = true; } });
    assert.ok(prevented);
  });
});
