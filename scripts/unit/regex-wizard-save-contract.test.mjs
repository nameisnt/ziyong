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
const scenario = await readMaybe(new URL('../../src/testing/visual/regexWizardScenarios.ts', import.meta.url));

test('regex wizard save and binding has one dedicated browser scenario', () => {
  assert.match(catalog, /regex-wizard-save/);
  assert.match(harness, /applyRegexWizardVisualScenario/);
  assert.match(harness, /useRegexDisplayStore/);
  assert.match(scenario, /name !== 'regex-wizard-save'/);
});

test('the regex wizard scenario proves rule, reader binding, and library use one id', () => {
  assert.match(scenario, /全局阅读正文/);
  assert.match(scenario, /保存到规则库/);
  assert.match(scenario, /getUsage\('reader'\)\.contentRuleId/);
  assert.match(scenario, /pc-regex-display-app/);
});
