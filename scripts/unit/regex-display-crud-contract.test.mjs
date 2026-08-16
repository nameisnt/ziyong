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
const scenario = await readMaybe(new URL('../../src/testing/visual/regexDisplayScenarios.ts', import.meta.url));

test('regex display CRUD has one dedicated browser scenario', () => {
  assert.match(catalog, /regex-display-crud/);
  assert.match(harness, /applyRegexDisplayVisualScenario/);
  assert.match(harness, /useRegexDisplayStore/);
  assert.match(scenario, /name !== 'regex-display-crud'/);
});

test('the regex display scenario covers usage, duplication, and confirmed deletion', () => {
  assert.match(scenario, /新增规则/);
  assert.match(scenario, /使用设置/);
  assert.match(scenario, /displayRuleIds\.includes/);
  assert.match(scenario, /复制规则/);
  assert.match(scenario, /删除规则/);
  assert.match(scenario, /pc-phone-notice-action/);
});
