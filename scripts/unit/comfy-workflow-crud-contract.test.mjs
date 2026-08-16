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
const scenario = await readMaybe(new URL('../../src/testing/visual/comfyScenarios.ts', import.meta.url));

test('ComfyUI has one dedicated local workflow CRUD scenario', () => {
  assert.match(catalog, /comfy-workflow-crud/);
  assert.match(harness, /applyComfyVisualScenario/);
  assert.match(scenario, /name !== 'comfy-workflow-crud'/);
});

test('the ComfyUI scenario covers real selection, duplication, and shared deletion', () => {
  assert.match(scenario, /pc-comfy-actions/);
  assert.match(scenario, /pc-combobox-option/);
  assert.match(scenario, /复制当前工作流/);
  assert.match(scenario, /confirmComfyWorkflowDeletion/);
  assert.match(scenario, /settings\.workflows/);
});
