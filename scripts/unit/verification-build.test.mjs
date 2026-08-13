/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const scripts = packageJson.scripts ?? {};

test('verification builds use an ignored temporary output directory', () => {
  assert.equal(
    scripts['build:check'],
    'vite build --outDir tmp/build-check --emptyOutDir',
    'build:check must build the current source without writing formal dist artifacts',
  );
  assert.match(scripts.verify, /(?:^|&&\s*)pnpm build:check(?:\s*&&|$)/);
  assert.doesNotMatch(scripts.verify, /(?:^|&&\s*)pnpm build(?:\s*&&|$)/);
  assert.match(scripts['verify:full'], /(?:^|&&\s*)pnpm build:check(?:\s*&&|$)/);
  assert.doesNotMatch(scripts['verify:full'], /(?:^|&&\s*)pnpm build(?:\s*&&|$)/);
});

test('the explicit production build still targets the configured dist output', () => {
  assert.equal(scripts.build, 'vite build');
});
