/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const preview = await readFile(new URL('../../src/components/BatchGenerationPreviewPage.vue', import.meta.url), 'utf8');
const diaryPage = await readFile(new URL('../../src/apps/diary/DiaryBatchPage.vue', import.meta.url), 'utf8');
const summaryPage = await readFile(new URL('../../src/apps/summary/SummaryBatchPage.vue', import.meta.url), 'utf8');
const diaryApp = await readFile(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url), 'utf8');
const summaryApp = await readFile(new URL('../../src/apps/summary/SummaryApp.vue', import.meta.url), 'utf8');
const runner = await readFile(new URL('../../src/core/manualBatchRunner.ts', import.meta.url), 'utf8');

test('manual batch pages expose completed previews while generation continues', () => {
  for (const source of [diaryPage, summaryPage]) {
    assert.match(source, /state\.previewCount/u);
    assert.match(source, /查看预览（\{\{ state\.previewCount \}\}）/u);
    assert.match(source, /\$emit\('preview'\)/u);
  }
  for (const source of [diaryApp, summaryApp]) {
    assert.match(source, /@preview="openBatchProgressPreview"/u);
    assert.match(source, /batchOrigin: 'generate'/u);
    assert.match(source, /:can-save="batchPreviewTask\.status === 'completed'"/u);
  }
});

test('live preview keeps edits, locks early saving and avoids completion navigation duplication', () => {
  assert.match(preview, /const currentDrafts = new Map/u);
  assert.match(preview, /emit\('back', getEdits\(\)\)/u);
  assert.match(preview, /完成后保存/u);
  assert.match(preview, /GenerationPreviewPanel/u);
  assert.match(preview, /\[思\]/u);
  assert.match(preview, /有思维链/u);
  assert.match(preview, /无思维链/u);
  assert.match(preview, /parseHandler/u);
  assert.match(preview, /registerNavigationGuard/u);
  assert.match(preview, /emit\('change', getEdits\(\)\)/u);
  assert.match(diaryApp, /:parse-handler="parseDiaryGeneratedResult"/u);
  assert.match(summaryApp, /:parse-handler="parseSimpleXmlResult"/u);
  assert.match(diaryApp, /@change="updateBatchPreview"/u);
  assert.match(summaryApp, /@change="updateBatchPreview"/u);
  assert.match(runner, /const alreadyViewingPreview/u);
  assert.match(runner, /if \(!alreadyViewingPreview\)/u);
});
