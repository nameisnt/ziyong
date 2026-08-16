/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const catalog = await readMaybe(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url));
const harness = await readMaybe(new URL('../../src/testing/visual-harness.ts', import.meta.url));
const scenario = await readMaybe(new URL('../../src/testing/visual/workbenchScenarios.ts', import.meta.url));

test('workbench has one dedicated workflow and step CRUD scenario', () => {
  assert.match(catalog, /workbench-crud/);
  assert.match(harness, /applyWorkbenchVisualScenario/);
  assert.match(scenario, /name !== 'workbench-crud'/);
});

test('the workbench scenario uses real combobox, ordering, and shared confirmations', () => {
  assert.match(scenario, /pc-step-picker/);
  assert.match(scenario, /pc-combobox-option/);
  assert.match(scenario, /moveStep/);
  assert.match(scenario, /confirmWorkbenchDeletion/);
  assert.match(scenario, /settings\.workflows/);
});
