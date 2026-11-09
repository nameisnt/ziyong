/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const sourceRoot = path.join(root, 'src');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

async function collectSources(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectSources(full).then(nested => files.push(...nested));
    else if (/\.(?:ts|vue)$/u.test(entry.name)) files.push(full);
  }
  return files;
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

test('no source file calls an event handle as if it were a function', async () => {
  const files = await collectSources(sourceRoot);
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const handles = [...source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:onTavernEvent|onRuntimeEvent)\(/gu)].map(
      match => match[1],
    );
    for (const handle of handles) {
      const callPattern = new RegExp(`(?:^|[^.\\w])${handle}\\(`, 'u');
      if (callPattern.test(source)) {
        offenders.push(`${path.relative(root, file)} calls ${handle}() on a StopHandle`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});
