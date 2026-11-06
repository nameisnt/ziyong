/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function read(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

test('pre-push hook is the single static gate before a push', async () => {
  const hook = await read('.githooks/pre-push');

  assert.match(hook, /^#!\/bin\/sh/m, 'hook must be a POSIX shell script');
  assert.match(hook, /^set -e$/m, 'hook must abort on the first failure');
  assert.match(hook, /git rev-parse --show-toplevel/, 'hook must run from the repository root');
  assert.match(hook, /pnpm verify:static/, 'hook must run the full static verification');
  assert.match(hook, /exit 1/, 'hook must block the push when verification fails');
  assert.doesNotMatch(hook, /verify:ui|ui:check/, 'hook must stay local-only and must not need a browser');
});

test('install-hooks script and package script point at the shared hooks directory', async () => {
  const installer = await read('scripts/install-hooks.mjs');
  const pkg = JSON.parse(await read('package.json'));

  assert.match(installer, /core\.hooksPath/, 'installer must set core.hooksPath');
  assert.match(installer, /\.githooks/, 'installer must point at .githooks');
  assert.equal(pkg.scripts['hooks:install'], 'node scripts/install-hooks.mjs');
});
