/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const file = 'src/apps/chat-insert/ChatInsertApp.vue';
const source = await readFile(new URL('../../src/apps/chat-insert/ChatInsertApp.vue', import.meta.url), 'utf8');

test('the Chat Insert icon button has the same accessible name as its title', () => {
  const nameFindings = scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label');
  assert.deepEqual(nameFindings, []);

  const iconButtons = [...source.matchAll(/<button\b(?:[^>"']|"[^"]*"|'[^']*')*>/g)]
    .map(match => match[0])
    .filter(tag => /\bclass="[^"]*\bpc-icon-btn\b[^"]*"/.test(tag));
  assert.equal(iconButtons.length, 1, file);

  const title = iconButtons[0].match(/\s(:?)title="([^"]+)"/);
  const ariaLabel = iconButtons[0].match(/\s(:?)aria-label="([^"]+)"/);
  assert.ok(title, `missing title in ${file}: ${iconButtons[0]}`);
  assert.ok(ariaLabel, `missing aria-label in ${file}: ${iconButtons[0]}`);
  assert.deepEqual(ariaLabel.slice(1), title.slice(1), file);
});
