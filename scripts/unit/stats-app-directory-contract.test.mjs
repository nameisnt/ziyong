/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('stats has one app-owned root without moving its aggregation store', async () => {
  const files = (await readdir(new URL('../../src/apps/stats/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, ['StatsApp.vue']);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/stats/StatsApp.vue');
  assert.match(builtin, /from '@\/apps\/stats\/StatsApp\.vue'/u);
  assert.match(root, /from '@\/store\/stats'/u);

  await assert.rejects(access(new URL('../../src/components/StatsApp.vue', import.meta.url)));
});
