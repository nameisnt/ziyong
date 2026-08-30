/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const file = 'src/components/PhoneOverlay.vue';
const source = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');

test('every Phone topbar icon button has the same accessible name as its title', () => {
  const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
    .map(match => match[0])
    .filter(tag => /\bclass="[^"]*\bpc-top-btn\b[^"]*"/.test(tag));
  assert.equal(iconButtons.length, 4, file);

  for (const tag of iconButtons) {
    const title = tag.match(/\s(:?)title="([^"]+)"/);
    const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
    assert.ok(title, `missing title in ${file}: ${tag}`);
    assert.ok(ariaLabel, `missing aria-label in ${file}: ${tag}`);
    assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
  }
});

test('Phone overlay keeps shared icon-button contracts clean', () => {
  const nameFindings = scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label');
  assert.deepEqual(nameFindings, []);
});
