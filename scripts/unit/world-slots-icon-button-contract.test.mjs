/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const file = 'src/apps/world-slots/WorldSlotsApp.vue';
const source = await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8');

test('World Slots delegates management to ActionMenu and keeps only the labeled sync retry icon action', () => {
  const nameFindings = scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label');
  assert.deepEqual(nameFindings, []);

  const iconButtons = [...source.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
    .map(match => match[0])
    .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
  assert.equal(iconButtons.length, 1, file);
  assert.match(iconButtons[0], /:title="t`重试同步`"/u);
  assert.match(iconButtons[0], /:aria-label="t`重试同步`"/u);
  assert.match(source, /<ActionMenu icon-only :label="t`管理`" icon="fa-solid fa-bars">/u);
});
