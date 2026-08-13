/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  UI_INTERACTION_CONTRACTS,
  getInteractionContractScenarios,
} from '../ui-interaction-contracts.mjs';

const expectedContracts = {
  back: 'tutorial-scroll-return',
  catalog: 'summary-entry-detail',
  close: 'prompts-task-detail',
  'delete-unbind': 'content-version-interactions',
  persistence: 'content-directory-sort-persistence',
  reparse: 'theater-failed-draft',
  toggle: 'extras-chapter-detail',
};

test('the shared interaction contract has exactly one representative scenario for every required action', () => {
  const actualContracts = Object.fromEntries(
    UI_INTERACTION_CONTRACTS.map(contract => [contract.id, contract.scenario]),
  );

  assert.deepEqual(actualContracts, expectedContracts);
  assert.equal(new Set(getInteractionContractScenarios()).size, UI_INTERACTION_CONTRACTS.length);
  assert.deepEqual(getInteractionContractScenarios(), UI_INTERACTION_CONTRACTS.map(contract => contract.scenario));
});

test('every representative interaction scenario exists in the visual harness catalog', async () => {
  const catalog = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');

  for (const scenario of getInteractionContractScenarios()) {
    assert.match(catalog, new RegExp(`['"]${scenario}['"]`), `${scenario} is missing from the visual catalog`);
  }
});

test('the default UI verification consumes the shared contract instead of copying a scenario list', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const verifyUi = packageJson.scripts?.['verify:ui'] ?? '';
  const runner = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

  assert.match(verifyUi, /(?:^|\s)--interaction-contracts(?:\s|$)/);
  assert.doesNotMatch(verifyUi, /--scenarios=/);
  assert.match(runner, /getInteractionContractScenarios\(\)/);
});
