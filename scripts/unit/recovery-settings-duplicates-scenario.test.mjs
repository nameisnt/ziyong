/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const scenarios = await readFile(new URL('../../src/testing/visual/recoveryScenarios.ts', import.meta.url), 'utf8');
const catalog = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');

test('settings duplicate management has one isolated visual scenario', () => {
  for (const source of [scenarios, catalog]) assert.match(source, /recovery-settings-duplicates/u);
  assert.match(scenarios, /'recovery-settings-duplicates': 'settings-duplicates'/u);
  assert.match(scenarios, /settingsDuplicateScanResult/u);
  assert.match(scenarios, /visual-settings-hash/u);
});
