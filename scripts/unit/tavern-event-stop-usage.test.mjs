/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('onTavernEvent hands back an object with a stop method', async () => {
  const source = await read('src/util/runtime.ts');
  assert.match(source, /type StopHandle = \{ stop: \(\) => void \};/u);
  assert.match(source, /function noopStopHandle\(\): StopHandle \{\s*return \{\s*stop\(\) \{\},?\s*\};?\s*\}/u);
});

test('stop handles are released through their stop method, never called directly', async () => {
  // A direct call throws "stop is not a function" inside onScopeDispose, which aborts the
  // Vue unmount half way and leaves the previous page visible.
  const panel = await read('src/components/GenerationPanel.vue');
  assert.match(panel, /stopMessageEvents\.forEach\(stop => stop\.stop\(\)\);/u);
  assert.doesNotMatch(panel, /forEach\(stop => stop\(\)\)/u);
});

