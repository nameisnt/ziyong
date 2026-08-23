/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('theater root and domain files have one app-owned directory', async () => {
  const files = (await readdir(new URL('../../src/apps/theater/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'TheaterApp.vue',
    'TheaterCatalogPage.vue',
    'TheaterEntryDetailPage.vue',
    'TheaterEntryEditorPage.vue',
    'TheaterHistoryPage.vue',
    'TheaterMixedContent.vue',
    'theaterTypeRandom.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/theater/TheaterApp.vue');
  const detail = await source('src/apps/theater/TheaterEntryDetailPage.vue');
  assert.match(builtin, /from '@\/apps\/theater\/TheaterApp\.vue'/u);
  assert.equal([...root.matchAll(/from '@\/apps\/theater\/[^']+'/gu)].length, 6);
  assert.match(detail, /from '@\/apps\/theater\/TheaterMixedContent\.vue'/u);

  await assert.rejects(access(new URL('../../src/components/TheaterApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/theater/', import.meta.url)));
});
