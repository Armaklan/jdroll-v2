import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTemplateFields, parsePersoFields } from '../../../../frontend/src/utils/character-sheet.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load example files
const exampleFieldTxt = fs.readFileSync(path.resolve(__dirname, '../../../../exemple/template-field.txt'), 'utf-8');
const exampleCharTxt = fs.readFileSync(path.resolve(__dirname, '../../../../exemple/template-character.txt'), 'utf-8');

describe('Character Sheet Backward Compatibility', () => {
  it('parses template-field.txt correctly', () => {
    const parsed = parseTemplateFields(exampleFieldTxt);
    assert.equal(parsed.maxCount, 11);
    assert.equal(parsed.fields.length, 11);

    const f1 = parsed.fields.find((f) => f.id === 1);
    assert.ok(f1);
    assert.equal(f1.top, 38);
    assert.equal(f1.left, 281);
    assert.equal(f1.width, 218);
    assert.equal(f1.height, 42);
  });

  it('parses fields positioned with CSS inset property', () => {
    const htmlWithInset = `
      <div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="3"></div>
      <div class="ui-draggable ui-draggable-handle JDRollDroppedUserControl ui-resizable" id="JDRollUserControl_1" style="position: absolute; inset: 60px auto auto 437px; width: 150px; height: 32px;">
        <a id="JDRollUserControlLink1_child" data-type="text" class="editable editable-click">Nom</a>
      </div>
      <div class="ui-draggable ui-draggable-handle JDRollDroppedUserControl ui-resizable" id="JDRollUserControl_2" style="position: absolute; inset: 120px 50px; width: 200px; height: 50px;">
        <a id="JDRollUserControlLink2_child" data-type="textarea" class="editable editable-click">Description</a>
      </div>
      <div class="ui-draggable ui-draggable-handle JDRollDroppedUserControl ui-resizable" id="JDRollUserControl_3" style="position: absolute; inset: 200px auto 10px 80px; width: 100px; height: 30px;">
        <a id="JDRollUserControlLink3_child" data-type="JDRollEditableSelect" class="editable editable-click">Classe</a>
        <input type="hidden" id="JDRollUserControl_3_hide" value="Guerrier, Voleur, Mage">
      </div>
    `;

    const parsed = parseTemplateFields(htmlWithInset);
    assert.equal(parsed.maxCount, 3);
    assert.equal(parsed.fields.length, 3);

    const f1 = parsed.fields.find((f) => f.id === 1);
    assert.ok(f1);
    assert.equal(f1.top, 60);
    assert.equal(f1.left, 437);
    assert.equal(f1.width, 150);
    assert.equal(f1.height, 32);
    assert.equal(f1.type, 'text');

    const f2 = parsed.fields.find((f) => f.id === 2);
    assert.ok(f2);
    assert.equal(f2.top, 120);
    assert.equal(f2.left, 50);
    assert.equal(f2.type, 'textarea');

    const f3 = parsed.fields.find((f) => f.id === 3);
    assert.ok(f3);
    assert.equal(f3.top, 200);
    assert.equal(f3.left, 80);
    assert.equal(f3.type, 'JDRollEditableSelect');
    assert.deepEqual(f3.options, ['Guerrier', 'Voleur', 'Mage']);
  });

  it('parses template-character.txt values correctly', () => {
    const values = parsePersoFields(exampleCharTxt);

    assert.equal(values['JDRollUserControlLink1_child'], 'Abou Ibn Battuta');
    assert.equal(values['JDRollUserControlLink2_child'], 'Esquive acrobatique\nAttaque sournoise');
    assert.equal(values['JDRollUserControlLink5_child'], '16');
    assert.equal(values['JDRollUserControlLink9_child'], 'Jeune marin agile');
    assert.equal(values['JDRollUserControlLink10_child'], 'Curieux discret sachant se faire oublier');
  });
});
