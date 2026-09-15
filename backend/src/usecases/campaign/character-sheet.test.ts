import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load example files
const exampleFieldTxt = fs.readFileSync(path.resolve(__dirname, '../../../../exemple/template-field.txt'), 'utf-8');
const exampleCharTxt = fs.readFileSync(path.resolve(__dirname, '../../../../exemple/template-character.txt'), 'utf-8');

describe('Character Sheet Backward Compatibility', () => {
  it('parses template-field.txt correctly', () => {
    const countMatch = exampleFieldTxt.match(/id=["']hiddenFieldsCount["']\s+value=["'](\d+)["']/i);
    assert.ok(countMatch);
    const maxCount = parseInt(countMatch[1], 10);
    assert.equal(maxCount, 11);

    const controlRegex = /<div\s+[^>]*id=["']JDRollUserControl_(\d+)["'][^>]*>([\s\S]*?)<\/div>(?=(?:<div\s+[^>]*id=["']JDRollUserControl_|$))/gi;
    const matches: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = controlRegex.exec(exampleFieldTxt)) !== null) {
      const id = parseInt(match[1], 10);
      if (id !== 0) matches.push(id);
    }

    assert.deepEqual(matches, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('parses template-character.txt values correctly', () => {
    const values: Record<string, string> = {};
    const regex = /<input[^>]*id=["']([^"']*)_hidden["'][^>]*value=(?:"([\s\S]*?)"|'([\s\S]*?)')/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(exampleCharTxt)) !== null) {
      const linkId = match[1];
      const val = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : '';
      values[linkId] = val;
    }

    assert.equal(values['JDRollUserControlLink1_child'], 'Abou Ibn Battuta');
    assert.equal(values['JDRollUserControlLink2_child'], 'Esquive acrobatique\nAttaque sournoise');
    assert.equal(values['JDRollUserControlLink5_child'], '16');
    assert.equal(values['JDRollUserControlLink9_child'], 'Jeune marin agile');
    assert.equal(values['JDRollUserControlLink10_child'], 'Curieux discret sachant se faire oublier');
  });
});
