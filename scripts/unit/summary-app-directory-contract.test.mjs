/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('summary root, live pages and sessions have one app-owned directory', async () => {
  const files = (await readdir(new URL('../../src/apps/summary/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'SummaryApp.vue',
    'SummaryBaguPage.vue',
    'SummaryBatchPage.vue',
    'SummaryBookEditorPage.vue',
    'SummaryBookPage.vue',
    'SummaryCatalogPage.vue',
    'SummaryEntryDetailPage.vue',
    'SummaryEntryEditorPage.vue',
    'SummaryFailedDraftPage.vue',
    'SummaryGeneratePage.vue',
    'SummaryImportPage.vue',
    'SummaryPreviewPage.vue',
    'useSummaryBatchSession.ts',
    'useSummaryBookSession.ts',
    'useSummaryGenerationActions.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/summary/SummaryApp.vue');
  assert.match(builtin, /import\('@\/apps\/summary\/SummaryApp\.vue'\)/u);
  assert.equal([...root.matchAll(/from '@\/apps\/summary\/[^']+'/gu)].length, 14);
  await assert.rejects(access(new URL('../../src/components/SummaryApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/summary/', import.meta.url)));
});
