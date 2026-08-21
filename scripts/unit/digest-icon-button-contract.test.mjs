/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const file = 'src/apps/digest/DigestApp.vue';
const source = await readFile(new URL('../../src/apps/digest/DigestApp.vue', import.meta.url), 'utf8');

test('every Digest icon button has an accurate accessible name', () => {
  const nameFindings = scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label');
  assert.deepEqual(nameFindings, []);

  const iconButtons = [...source.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
    .map(match => match[0])
    .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
  assert.equal(iconButtons.length, 2, file);

  for (const tag of iconButtons) {
    const title = tag.match(/\s(:?)title="([^"]+)"/);
    const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
    assert.ok(title, `missing title in ${file}: ${tag}`);
    assert.ok(ariaLabel, `missing aria-label in ${file}: ${tag}`);
    if (tag.includes('sortDesc = !sortDesc')) {
      assert.equal(ariaLabel[2], 'sortDesc ? t`切换为正序` : t`切换为倒序`', file);
    } else {
      assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
    }
  }
});
