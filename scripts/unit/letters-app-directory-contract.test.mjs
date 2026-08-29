/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('letters root and domain pages have one app-owned directory', async () => {
  const files = (await readdir(new URL('../../src/apps/letters/', import.meta.url)))
    .filter(file => file.endsWith('.vue'))
    .sort();

  assert.deepEqual(files, [
    'LettersApp.vue',
    'LettersBaguPage.vue',
    'LettersBookEditorPage.vue',
    'LettersBookPage.vue',
    'LettersCatalogPage.vue',
    'LettersEntryDetailPage.vue',
    'LettersEntryEditorPage.vue',
    'LettersFailedDraftPage.vue',
    'LettersGeneratePage.vue',
    'LettersPreviewPage.vue',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/letters/LettersApp.vue');
  assert.match(builtin, /import\('@\/apps\/letters\/LettersApp\.vue'\)/u);
  assert.equal([...root.matchAll(/from '@\/apps\/letters\/Letters[^']+\.vue'/gu)].length, 9);

  await assert.rejects(access(new URL('../../src/components/LettersApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/letters/', import.meta.url)));
});
