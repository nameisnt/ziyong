/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('diary root and domain files have one app-owned directory without wiring the unused page', async () => {
  const files = (await readdir(new URL('../../src/apps/diary/', import.meta.url)))
    .filter(file => file.endsWith('.vue'))
    .sort();

  assert.deepEqual(files, [
    'DiaryApp.vue',
    'DiaryBaguPage.vue',
    'DiaryBatchPage.vue',
    'DiaryBookEditorPage.vue',
    'DiaryBookPage.vue',
    'DiaryCatalogPage.vue',
    'DiaryCreationModePage.vue',
    'DiaryEntryDetailPage.vue',
    'DiaryEntryEditorPage.vue',
    'DiaryFailedDraftPage.vue',
    'DiaryGeneratePage.vue',
    'DiaryPreviewPage.vue',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/diary/DiaryApp.vue');
  assert.match(builtin, /from '@\/apps\/diary\/DiaryApp\.vue'/u);
  assert.equal([...root.matchAll(/from '@\/apps\/diary\/Diary[^']+\.vue'/gu)].length, 10);
  assert.doesNotMatch(root, /DiaryCreationModePage/u);

  await assert.rejects(access(new URL('../../src/components/DiaryApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/diary/', import.meta.url)));
});
