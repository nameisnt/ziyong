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
const scenario = await readMaybe(new URL('../../src/testing/visual/fileRepositoryScenarios.ts', import.meta.url));
const memoryFileService = await readMaybe(new URL('../../src/testing/visual/memoryFileService.ts', import.meta.url));

test('file repository owns one isolated end-to-end browser scenario', () => {
  assert.match(catalog, /file-repository-operations/);
  assert.match(harness, /applyFileRepositoryVisualScenario/);
  assert.match(harness, /useFileRepositoryStore/);
  assert.match(scenario, /name !== 'file-repository-operations'/);
});

test('the repository scenario exercises file operations and persistent failure feedback', () => {
  assert.match(scenario, /installMemoryFileService/);
  assert.match(memoryFileService, /\/api\/files\/upload/);
  assert.match(memoryFileService, /\/api\/files\/delete/);
  assert.match(scenario, /立即快照/);
  assert.match(scenario, /保护版本/);
  assert.match(scenario, /取消保护/);
  assert.match(scenario, /确认删除这份文件快照吗/);
  assert.match(scenario, /文件仓库操作失败/);
});
