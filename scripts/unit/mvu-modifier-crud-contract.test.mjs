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
const scenario = await readMaybe(new URL('../../src/testing/visual/mvuModifierScenarios.ts', import.meta.url));

test('MVU Modifier has one dedicated add favorite delete and history scenario', () => {
  assert.match(catalog, /mvu-modifier-crud/);
  assert.match(harness, /applyMvuModifierVisualScenario/);
  assert.match(scenario, /name !== 'mvu-modifier-crud'/);
});

test('the MVU scenario covers local mutations and both shared confirmations', () => {
  assert.match(scenario, /新增子项/);
  assert.match(scenario, /收藏变量/);
  assert.match(scenario, /删除变量/);
  assert.match(scenario, /清空记录/);
  assert.match(scenario, /confirmMvuAction/);
  assert.match(scenario, /replaceMvuData/);
});
