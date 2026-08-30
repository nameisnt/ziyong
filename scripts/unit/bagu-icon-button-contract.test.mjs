/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const file = 'src/apps/bagu/BaguApp.vue';
const source = await readFile(new URL('../../src/apps/bagu/BaguApp.vue', import.meta.url), 'utf8');

test('every Bagu rule-manager icon button has the same accessible name as its title', () => {
  const nameFindings = scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label');
  assert.deepEqual(nameFindings, []);

  const iconButtons = [...source.matchAll(/<button\b[\s\S]*?>/g)]
    .map(match => match[0])
    .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
  assert.equal(iconButtons.length, 6);

  for (const tag of iconButtons) {
    const title = tag.match(/\s(:?)title="([^"]+)"/);
    const ariaLabel = tag.match(/\s(:?)aria-label="([^"]+)"/);
    assert.ok(title, `missing title in ${file}: ${tag}`);
    assert.ok(ariaLabel, `missing aria-label in ${file}: ${tag}`);
    assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
  }
});

test('Bagu sections do not stack redundant vertical spacing around their headers', () => {
  assert.match(source, /\.pc-bagu-page\s*\{[\s\S]*?gap:\s*0;/u);
  assert.match(source, /\.pc-bagu-panel\s*\{[\s\S]*?gap:\s*8px;/u);
  assert.doesNotMatch(source, /\.pc-panel-head\s*\{[^}]*padding-bottom/u);
  assert.doesNotMatch(source, /\.pc-rule-table\s*\{[^}]*padding-top/u);
});
