/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('local deploy is a separate, dry-run-first tool', async () => {
  const source = await readFile(resolve(root, 'scripts/deploy-local.mjs'), 'utf8');
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['deploy:local'], 'node scripts/deploy-local.mjs');
  assert.match(source, /apply: false/, 'dry run must be the default');
  assert.match(source, /if \(!options\.apply\)/, 'dry run must return before copying');
  assert.ok(
    source.indexOf('if (!options.apply)') < source.indexOf('cpSync(target, backupDir'),
    'the backup must only happen in apply mode',
  );
  assert.match(source, /cpSync\(target, backupDir/, 'the install directory must be backed up first');
  assert.match(source, /sha256\(join\(target, 'dist', 'index\.js'\)\)/, 'the copy must be verified by hash');
});

test('release script does not depend on the local deploy tool', async () => {
  const source = await readFile(resolve(root, 'scripts/release.mjs'), 'utf8');
  assert.doesNotMatch(source, /deploy-local|SillyTavern/, 'publishing must never touch a local install directory');
});

test('local deploy prints its plan without touching the disk', () => {
  const output = execFileSync(process.execPath, [resolve(root, 'scripts/deploy-local.mjs')], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /dry-run 完成/);
});
