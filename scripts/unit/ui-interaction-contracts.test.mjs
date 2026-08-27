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
  'bagu-modal': 'bagu-hit-details',
  catalog: 'summary-entry-detail',
  close: 'prompts-task-detail',
  'creation-modal': 'diary-creation-mode',
  'delete-unbind': 'content-version-interactions',
  'home-group-management': 'home',
  persistence: 'content-directory-sort-persistence',
  'reasoning-disclosure': 'card-writer-reasoning-modal',
  'reparse-diary': 'diary-failed-draft-reparse',
  'reparse-digest': 'digest-failed-draft-reparse',
  'reparse-forum': 'forum-failed-draft-reparse',
  'reparse-letters': 'letters-failed-draft-reparse',
  'reparse-storylines': 'storylines-failed-draft-reparse',
  'reparse-summary': 'summary-failed-draft-reparse',
  'reparse-theater': 'theater-failed-draft',
  'settings-persistence': 'settings-theme-persistence',
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
