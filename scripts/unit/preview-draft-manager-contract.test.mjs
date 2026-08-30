/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const notice = await readFile(new URL('../../src/components/PreviewDraftNotice.vue', import.meta.url), 'utf8');
const persistence = await readFile(new URL('../../src/util/previewDrafts.ts', import.meta.url), 'utf8');
const managerConsumers = await Promise.all(
  [
    '../../src/apps/diary/DiaryCatalogPage.vue',
    '../../src/apps/letters/LettersCatalogPage.vue',
    '../../src/apps/forum/ForumCatalogPage.vue',
    '../../src/apps/summary/SummaryCatalogPage.vue',
    '../../src/apps/theater/TheaterCatalogPage.vue',
    '../../src/apps/extras/ExtrasCatalogPage.vue',
    '../../src/apps/digest/DigestApp.vue',
    '../../src/apps/relationship/RelationshipApp.vue',
    '../../src/apps/app-builder/CustomAppHost.vue',
    '../../src/apps/card-writer/CardWriterApp.vue',
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')),
);

test('preview draft notice is the shared count, latest-continue and manager entry', () => {
  assert.match(notice, /未保存预览（\{\{ drafts\.length \}\} 份）/);
  assert.match(notice, /继续最新/);
  assert.match(notice, /管理草稿/);
  assert.match(notice, /open-id/);
  assert.match(notice, /discard: \[id: string\]/);
  assert.match(notice, /phone\.confirmNotice\(/);
  assert.match(notice, /usePhoneModalLifecycle/);
  assert.match(notice, /function openManager\(\) \{\s*selectedDraftIds\.value = \[\];/);
});

test('preview persistence can explicitly select or delete only a manager-selected id', () => {
  assert.match(persistence, /function openPreviewDraft\(id = draft\.value\?\.id \|\| ''\)/);
  assert.match(persistence, /function discardPreviewDraft\(id = draft\.value\?\.id \|\| ''\)/);
  assert.match(persistence, /activeDraftId\.value = saved\.id/);
});

test('every registered preview home forwards a manager-selected draft id through the shared notice', () => {
  for (const source of managerConsumers) {
    assert.match(source, /PreviewDraftNotice[\s\S]*?@open-id=/);
  }
});
