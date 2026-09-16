import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWidgets, serializeWidgets, mergeCharacterWidgets, changeWidgetValue } from './widgets.js';

describe('widgets utils', () => {
  it('parseWidgets should parse valid JSON array', () => {
    const json = '[{"id":"1","name":"PV","type":"jauge","low":0,"up":10,"value":8},{"id":"2","name":"Hero","type":"token","low":0,"up":5,"value":2}]';
    const result = parseWidgets(json);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'PV');
    assert.equal(result[0].type, 'jauge');
    assert.equal(result[0].value, 8);
    assert.equal(result[1].name, 'Hero');
    assert.equal(result[1].value, 2);
  });

  it('parseWidgets should handle invalid or empty JSON gracefully', () => {
    assert.deepEqual(parseWidgets(''), []);
    assert.deepEqual(parseWidgets(null), []);
    assert.deepEqual(parseWidgets(undefined), []);
    assert.deepEqual(parseWidgets('{ invalid json }'), []);
    assert.deepEqual(parseWidgets('{}'), []);
  });

  it('serializeWidgets should stringify widgets array', () => {
    const widgets = [{ id: '1', name: 'PV', type: 'jauge' as const, low: 0, up: 10, value: 8 }];
    const str = serializeWidgets(widgets);
    assert.equal(str, JSON.stringify(widgets));
  });

  it('mergeCharacterWidgets should merge campaign config and character values including custom bounds', () => {
    const campaignWidgets = JSON.stringify([
      { id: 'w1', name: 'Points de Vie', type: 'jauge', low: 0, up: 20, value: 20 },
      { id: 'w2', name: 'Mana', type: 'jauge', low: 0, up: 10, value: 10 },
      { id: 'w3', name: 'Notes', type: 'text', low: 0, up: 0, value: '' },
    ]);
    const characterWidgets = JSON.stringify([
      { id: 'w1', name: 'Points de Vie', type: 'jauge', low: 5, up: 35, value: 14 },
    ]);

    const merged = mergeCharacterWidgets(campaignWidgets, characterWidgets);
    assert.equal(merged.length, 3);
    assert.equal(merged[0].id, 'w1');
    assert.equal(merged[0].value, 14); // from character
    assert.equal(merged[0].low, 5); // custom min from character
    assert.equal(merged[0].up, 35); // custom max from character
    assert.equal(merged[1].id, 'w2');
    assert.equal(merged[1].value, 10); // default from campaign
    assert.equal(merged[1].low, 0);
    assert.equal(merged[1].up, 10);
    assert.equal(merged[2].id, 'w3');
    assert.equal(merged[2].value, '');
  });

  it('changeWidgetValue should increment and decrement jauge within bounds', () => {
    const widgets = [
      { id: 'w1', name: 'PV', type: 'jauge' as const, low: 0, up: 10, value: 5 },
    ];

    const inc = changeWidgetValue(widgets, 'w1', 1);
    assert.equal(inc[0].value, 6);

    const atMax = changeWidgetValue(widgets, 'w1', 10);
    assert.equal(atMax[0].value, 10);

    const atMin = changeWidgetValue(widgets, 'w1', -10);
    assert.equal(atMin[0].value, 0);
  });

  it('changeWidgetValue should increment token without maximum and decrement with minimum 0', () => {
    const widgets = [
      { id: 'w1', name: 'Tokens', type: 'token' as const, low: 0, up: 0, value: 2 },
    ];

    const inc = changeWidgetValue(widgets, 'w1', 1);
    assert.equal(inc[0].value, 3);

    const large = changeWidgetValue(widgets, 'w1', 100);
    assert.equal(large[0].value, 102);

    const atMin = changeWidgetValue(widgets, 'w1', -10);
    assert.equal(atMin[0].value, 0);
  });
});
