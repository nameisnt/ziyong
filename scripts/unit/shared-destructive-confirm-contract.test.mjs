/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const consumers = [
  ['chat archive scope migration', '../../src/apps/archive/ChatArchiveApp.vue'],
];

test('destructive app actions do not bypass the shared phone confirmation', async () => {
  for (const [name, relativePath] of consumers) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /window\.confirm\s*\(/u, `${name} still uses the browser confirmation`);
    assert.match(source, /phone\.confirmNotice\s*\(/u, `${name} does not use the shared phone confirmation`);
  }
});
