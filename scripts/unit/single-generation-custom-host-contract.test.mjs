/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../../src/apps/app-builder/CustomAppHost.vue', import.meta.url),
  'utf8',
);

test('GEN02E custom host uses its mounted dynamic app id as the durable single-task identity', () => {
  assert.match(source, /useSingleGenerationTaskSession/);
  assert.match(source, /appId:\s*hostAppId/);
  assert.match(source, /actionId:\s*'generate'/);
  assert.match(source, /generationSession\.create\(/);
  assert.match(source, /lifecycle:\s*generationSession\.lifecycle\(task\.id\)/);
});

test('GEN02E custom host retains all three result routes without local runtime ownership', () => {
  assert.doesNotMatch(source, /stopGenerationByIdSafe/);
  assert.doesNotMatch(source, /generationId:\s*''/);
  assert.match(source, /:error="generationError"/);
  assert.match(source, /:raw-output="generationRawOutput"/);
  assert.match(source, /:running="generationRunning"/);
  for (const state of ['saved', 'preview', 'failed-draft']) {
    assert.match(source, new RegExp(`resultState: '${state}'`));
  }
});
