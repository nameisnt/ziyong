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
const scenario = await readMaybe(new URL('../../src/testing/visual/cloudMediaScenarios.ts', import.meta.url));

test('cloud media has one dedicated local profile CRUD scenario', () => {
  assert.match(catalog, /cloud-media-profile-crud/);
  assert.match(harness, /applyCloudMediaVisualScenario/);
  assert.match(scenario, /name !== 'cloud-media-profile-crud'/);
});

test('the profile scenario covers dynamic provider fields, selection, and shared deletion', () => {
  assert.match(scenario, /pc-cloud-profile-picker/);
  assert.match(scenario, /pc-combobox-option/);
  assert.match(scenario, /provider === 'minimax'/);
  assert.match(scenario, /kind === 'audio'/);
  assert.match(scenario, /confirmCloudProfileDeletion/);
  assert.match(scenario, /settings\.profiles/);
});
