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
const scenario = await readMaybe(new URL('../../src/testing/visual/appBuilderScenarios.ts', import.meta.url));

test('App Builder has one dedicated definition lifecycle scenario', () => {
  assert.match(catalog, /custom-app-definition-crud/);
  assert.match(harness, /applyAppBuilderVisualScenario/);
  assert.match(scenario, /name !== 'custom-app-definition-crud'/);
});

test('the App Builder scenario covers real duplication and shared deletion', () => {
  assert.match(scenario, /button\[title="复制 App"\]/);
  assert.match(scenario, /button\[title="删除 App"\]/);
  assert.match(scenario, /confirmAppDefinitionDeletion/);
  assert.match(scenario, /副本/);
  assert.match(scenario, /customAppChatDataField/);
});
