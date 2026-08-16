/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/testing/visual/readerScenarios.ts', import.meta.url), 'utf8');

test('reader footer visual scenario waits for the shared detail shell before tapping it', () => {
  const branch = source.match(/name === 'reader-footer-persistence'([\s\S]*?)else \{/u)?.[1] ?? '';
  assert.match(branch, /waitForCondition[\s\S]*pc-reader-detail-shell/u);
  assert.ok(branch.indexOf('waitForCondition') < branch.indexOf('toggleReaderFooter'));
});
