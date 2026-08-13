/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { scanVueUiContracts } from '../ui-contract-check.mjs';

const mvuFiles = ['MvuModifierApp.vue', 'MvuTreeNode.vue'];
const mvuSources = await Promise.all(
  mvuFiles.map(async file => ({
    file: `src/apps/mvu-modifier/${file}`,
    source: await readFile(new URL(`../../src/apps/mvu-modifier/${file}`, import.meta.url), 'utf8'),
  })),
);

test('every MVU modifier icon button has an accessible name', () => {
  const nameFindings = mvuSources.flatMap(({ file, source }) =>
    scanVueUiContracts(source, file).filter(finding => finding.ruleId === 'icon-button-aria-label'),
  );

  assert.deepEqual(nameFindings, []);
});
