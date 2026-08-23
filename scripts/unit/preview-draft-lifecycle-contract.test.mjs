/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const store = await readFile(new URL('../../src/store/previewDrafts.ts', import.meta.url), 'utf8');
const persistence = await readFile(new URL('../../src/util/previewDrafts.ts', import.meta.url), 'utf8');
const startConsumers = {
  customApp: [await readFile(new URL('../../src/apps/app-builder/CustomAppHost.vue', import.meta.url), 'utf8'), /beginPreviewDraft\(\);/],
  diary: [await readFile(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url), 'utf8'), /beginDiaryPreviewDraft\(\);/],
  digest: [await readFile(new URL('../../src/apps/digest/DigestApp.vue', import.meta.url), 'utf8'), /beginDigestPreviewDraft\(\);/],
  letters: [await readFile(new URL('../../src/apps/letters/LettersApp.vue', import.meta.url), 'utf8'), /beginLettersPreviewDraft\(\);/],
  relationship: [await readFile(new URL('../../src/apps/relationship/RelationshipApp.vue', import.meta.url), 'utf8'), /beginRelationshipPreviewDraft\(\);/],
  scenePlanner: [await readFile(new URL('../../src/apps/scene-planner/ScenePlannerApp.vue', import.meta.url), 'utf8'), /beginScenePreviewDraft\(\);/],
  storylines: [await readFile(new URL('../../src/apps/storylines/StorylinesApp.vue', import.meta.url), 'utf8'), /beginStorylinePreviewDraft\(\);/],
  theater: [await readFile(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url), 'utf8'), /beginTheaterPreviewDraft\(\);/],
  cardWriter: [await readFile(new URL('../../src/apps/card-writer/CardWriterApp.vue', import.meta.url), 'utf8'), /beginWriterPreviewDraft\(\);/],
};
const sharedActionConsumers = {
  extras: [await readFile(new URL('../../src/apps/extras/useExtrasGenerationActions.ts', import.meta.url), 'utf8'), /options\.beginChapterPreviewDraft\(\)[\s\S]*?options\.beginSummaryPreviewDraft\(\)/],
  forum: [await readFile(new URL('../../src/apps/forum/useForumGenerationActions.ts', import.meta.url), 'utf8'), /options\.beginPreviewDraft\(\)[\s\S]*?options\.beginPreviewDraft\(\)/],
  summary: [await readFile(new URL('../../src/apps/summary/useSummaryGenerationActions.ts', import.meta.url), 'utf8'), /options\.beginPreviewDraft\(\);/],
};

test('multi-preview lifecycle has explicit create, update, select and active-only delete operations', () => {
  assert.match(store, /function createPreviewDraft\(/);
  assert.match(store, /function updatePreviewDraft\(id: string/);
  assert.match(store, /function getPreviewDrafts\(/);
  assert.match(store, /function getPreviewDraftById\(/);
  assert.match(store, /function deletePreviewDraft\(id: string/);
  assert.match(persistence, /const activeDraftId = ref<string \| null>\(null\)/);
  assert.match(persistence, /function beginPreviewDraft\(\)/);
  assert.match(persistence, /previewDrafts\.createPreviewDraft\(input\)/);
  assert.match(persistence, /previewDrafts\.updatePreviewDraft\(current\.id, input\)/);
  assert.match(persistence, /previewDrafts\.deletePreviewDraft\(activeDraftId\.value\)/);
});

test('every preview-producing app starts a new draft instead of deleting an older one', () => {
  for (const [label, [source, pattern]] of Object.entries(startConsumers)) {
    assert.match(source, pattern, `${label} does not begin a new preview draft`);
  }
  for (const [label, [source, pattern]] of Object.entries(sharedActionConsumers)) {
    assert.match(source, pattern, `${label} generation actions do not begin a new preview draft`);
  }
});
