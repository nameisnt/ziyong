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
const scenario = await readMaybe(new URL('../../src/testing/visual/scenePlannerScenarios.ts', import.meta.url));

test('Scene Planner has one dedicated local history lifecycle scenario', () => {
  assert.match(catalog, /scene-planner-history/);
  assert.match(harness, /applyScenePlannerVisualScenario/);
  assert.match(scenario, /name !== 'scene-planner-history'/);
});

test('the Scene Planner scenario covers selection reset and shared deletion', () => {
  assert.match(scenario, /pc-scene-history-main/);
  assert.match(scenario, /clickSceneMenuAction\(editor, '新增', '新方案'\)/);
  assert.match(scenario, /clickSceneMenuAction\(activeRow, '管理', '删除'\)/);
  assert.match(scenario, /summary\[aria-label="\$\{menuLabel\}"\]/);
  assert.match(scenario, /confirmScenePlanDeletion/);
  assert.match(scenario, /ScenePlannerScopeDataSchema/);
});
