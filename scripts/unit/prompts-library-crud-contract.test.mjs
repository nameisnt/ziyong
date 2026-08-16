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
const scenario = await readMaybe(new URL('../../src/testing/visual/promptsScenarios.ts', import.meta.url));

test('prompt phrase and template CRUD has one dedicated browser scenario', () => {
  assert.match(catalog, /prompts-library-crud/);
  assert.match(harness, /applyPromptsVisualScenario/);
  assert.match(scenario, /name === 'prompts-library-crud'/);
});

test('the prompt library scenario saves both kinds and confirms destructive actions', () => {
  assert.match(scenario, /新增快速短语/);
  assert.match(scenario, /编辑快速短语/);
  assert.match(scenario, /删除快速短语/);
  assert.match(scenario, /新增快捷模板/);
  assert.match(scenario, /删除模板分组/);
  assert.match(scenario, /pc-phone-notice-action/);
});
