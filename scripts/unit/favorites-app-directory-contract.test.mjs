/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('favorites has one app-owned root without moving its cross-domain providers', async () => {
  const files = (await readdir(new URL('../../src/apps/favorites/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, ['FavoritesApp.vue']);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/favorites/FavoritesApp.vue');
  assert.match(builtin, /import\('@\/apps\/favorites\/FavoritesApp\.vue'\)/u);
  assert.match(root, /from '@\/core\/appRegistry'/u);
  assert.match(root, /from '@\/store\/favorites'/u);

  await assert.rejects(access(new URL('../../src/components/FavoritesApp.vue', import.meta.url)));
});
