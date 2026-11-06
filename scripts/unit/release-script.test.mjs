/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('release script defaults to a dry run and only acts with --apply', async () => {
  const source = await readFile(resolve(root, 'scripts/release.mjs'), 'utf8');

  assert.match(source, /apply: false/, 'dry run must be the default');
  assert.match(source, /--apply/, 'help must document --apply');
  assert.match(source, /if \(!options\.apply\)/, 'dry run must return before any write');
  assert.match(source, /release:notes/, 'version notes must go through the existing release:notes script');
  assert.ok(
    source.indexOf('if (!options.apply)') < source.indexOf("run('pnpm', ['build'])"),
    'the build must only run in apply mode',
  );
});

test('release script publishes both repositories from one build', async () => {
  const source = await readFile(resolve(root, 'scripts/release.mjs'), 'utf8');

  assert.match(source, /'push', 'origin', 'main'/, 'the source repository must be pushed');
  assert.match(source, /distRepo[\s\S]{0,400}'push', 'origin', 'main'/, 'the install repository must be pushed');
  assert.match(source, /sha256\(join\(root, 'dist\/index\.js'\)\)/, 'both copies must be compared by hash');
  assert.match(source, /'manifest\.json', 'package\.json', 'src\/core\/releaseInfo\.ts', 'dist'/, 'staging must be explicit');
});

test('dist is produced locally, not by a CI bot commit', () => {
  assert.equal(existsSync(resolve(root, '.github/workflows/bundle.yaml')), false, 'the bundle workflow must stay deleted');
});

test('release script is wired into package.json', async () => {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.release, 'node scripts/release.mjs');
});

test('release script prints usage without touching the repository', () => {
  const output = execFileSync(process.execPath, [resolve(root, 'scripts/release.mjs'), '--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /默认 dry-run/);
  assert.match(output, /--apply/);
});
