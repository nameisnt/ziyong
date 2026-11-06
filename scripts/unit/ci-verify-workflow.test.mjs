/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('CI runs the same gate as the local pre-push hook', async () => {
  const workflow = await readFile(resolve(root, '.github/workflows/verify.yaml'), 'utf8');

  assert.match(workflow, /^name: verify$/m);
  assert.match(workflow, /pnpm verify:static/, 'CI must run the shared static gate');
  assert.match(workflow, /pnpm build:check/, 'CI must prove the bundle still builds');
  assert.match(workflow, /node-version: 22/, 'CI must match the supported Node version');
  assert.match(workflow, /version: 10/, 'CI must match the pnpm major');
  assert.match(workflow, /runs-on: windows-latest/, 'the PowerShell style guards only run on Windows');
});

test('CI never writes back to the repository', async () => {
  const workflow = await readFile(resolve(root, '.github/workflows/verify.yaml'), 'utf8');

  assert.doesNotMatch(workflow, /add-and-commit/, 'CI must not commit');
  assert.doesNotMatch(workflow, /git push/, 'CI must not push');
  assert.doesNotMatch(workflow, /pnpm build\b(?!:)/, 'CI must build into a throwaway directory, not dist/');
});
