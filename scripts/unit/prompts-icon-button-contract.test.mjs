/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const promptSources = await Promise.all(
  ['PromptsApp.vue', 'PromptDetailDialogs.vue'].map(async name => ({ name, source: await readFile(new URL(`../../src/apps/prompts/${name}`, import.meta.url), 'utf8') })),
);

test('every prompts icon button has a tooltip and an accessible name', () => {
  const nameFindings = promptSources.flatMap(({ name, source }) =>
    scanVueUiContracts(source, `src/apps/prompts/${name}`).filter(finding =>
      ['icon-button-aria-label', 'icon-button-title'].includes(finding.ruleId),
    ),
  );

  assert.deepEqual(nameFindings, []);
});
