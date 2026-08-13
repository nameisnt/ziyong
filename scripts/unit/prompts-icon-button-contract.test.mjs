/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const promptsSource = await readFile(new URL('../../src/components/PromptsApp.vue', import.meta.url), 'utf8');

test('every prompts icon button has a tooltip and an accessible name', () => {
  const nameFindings = scanVueUiContracts(promptsSource, 'src/components/PromptsApp.vue').filter(finding =>
    ['icon-button-aria-label', 'icon-button-title'].includes(finding.ruleId),
  );

  assert.deepEqual(nameFindings, []);
});
