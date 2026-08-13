/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const harnessUrl = new URL('../../src/testing/visual-harness.ts', import.meta.url);
const readerModuleUrl = new URL('../../src/testing/visual/readerScenarios.ts', import.meta.url);
const readerScenarios = [
  'reader-detail',
  'reader-theme-appearance',
  'reader-footer-persistence',
  'reader-catalog',
];

test('reader visual scenarios have one dedicated module and do not keep branches in the coordinator', async () => {
  const [harness, readerModule] = await Promise.all([
    readFile(harnessUrl, 'utf8'),
    readFile(readerModuleUrl, 'utf8'),
  ]);

  assert.match(harness, /applyReaderVisualScenario/);
  for (const scenario of readerScenarios) {
    assert.match(readerModule, new RegExp(`['"]${scenario}['"]`));
    assert.doesNotMatch(harness, new RegExp(`name === ['"]${scenario}['"]`));
  }
  assert.equal((harness.match(/applyReaderVisualScenario\(/g) ?? []).length, 1);
});
