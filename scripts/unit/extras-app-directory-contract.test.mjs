/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('extras root and domain files have one app-owned directory', async () => {
  const files = (await readdir(new URL('../../src/apps/extras/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'ExtrasApp.vue',
    'ExtrasBookEditorPage.vue',
    'ExtrasBookOverviewPage.vue',
    'ExtrasCatalogPage.vue',
    'ExtrasChapterDetailPage.vue',
    'ExtrasChapterEditorPage.vue',
    'ExtrasChapterGeneratePage.vue',
    'ExtrasSummaryEditorPage.vue',
    'ExtrasSummaryGeneratePage.vue',
    'useExtrasBookEditorSession.ts',
    'useExtrasChapterEditorSession.ts',
    'useExtrasChapterPreviewSession.ts',
    'useExtrasChapterTypePromptSession.ts',
    'useExtrasChapterView.ts',
    'useExtrasDeletionSession.ts',
    'useExtrasGenerationActions.ts',
    'useExtrasGenerationState.ts',
    'useExtrasSummaryEditorSession.ts',
    'useExtrasSummaryPreviewSession.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/extras/ExtrasApp.vue');
  assert.match(builtin, /from '@\/apps\/extras\/ExtrasApp\.vue'/u);
  assert.equal([...root.matchAll(/from '@\/apps\/extras\/[^']+'/gu)].length, 18);

  await assert.rejects(access(new URL('../../src/components/ExtrasApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/extras/', import.meta.url)));
});
