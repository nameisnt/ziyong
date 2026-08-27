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
const scenario = await readMaybe(new URL('../../src/testing/visual/presetManagerScenarios.ts', import.meta.url));
const memoryFileService = await readMaybe(new URL('../../src/testing/visual/memoryFileService.ts', import.meta.url));

test('plugin preset lifecycle has one isolated browser scenario', () => {
  assert.match(catalog, /plugin-preset-lifecycle/);
  assert.match(harness, /applyPresetManagerVisualScenario/);
  assert.match(harness, /usePluginPresetStore/);
  assert.match(scenario, /name !== 'plugin-preset-lifecycle'/);
});

test('the lifecycle scenario covers default selection rename and confirmed deletion', () => {
  assert.match(scenario, /installMemoryFileService/);
  assert.match(memoryFileService, /\/api\/files\/upload/);
  assert.match(memoryFileService, /\/api\/files\/delete/);
  assert.match(scenario, /toggle-default-app/);
  assert.match(scenario, /预设改名/);
  assert.match(scenario, /确认把预设/);
  assert.match(scenario, /删除预设/);
  assert.match(scenario, /getDefaultAppIds/);
});
