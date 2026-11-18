/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const extrasApp = await readFile(new URL('../../src/apps/extras/ExtrasApp.vue', import.meta.url), 'utf8');
const previewSession = await readFile(
  new URL('../../src/apps/extras/useExtrasChapterPreviewSession.ts', import.meta.url),
  'utf8',
);

test('the extras chapter preview normalizer keeps the rewrite target', () => {
  assert.match(
    extrasApp,
    /function normalizeExtraChapterPreview\(\s*preview: ExtraChapterPreview,\s*routeParams: Record<string, string>,?\s*\): ExtraChapterPreview \{/u,
  );
  assert.match(extrasApp, /bookId: preview\.bookId \|\| routeParams\.bookId \|\| ''/u);
  assert.match(extrasApp, /chapterId: preview\.chapterId \|\| routeParams\.chapterId \|\| ''/u);
  assert.match(extrasApp, /mode: normalizeChapterGenerationMode\(preview\.mode\)/u);
  assert.match(extrasApp, /targetVersionId: preview\.targetVersionId \|\| routeParams\.versionId \|\| ''/u);
});

test('the extras chapter preview draft saves its route parameters and normalizes on restore', () => {
  assert.match(
    extrasApp,
    /normalizePreview: \(preview, routeParams\) => normalizeExtraChapterPreview\(preview, routeParams\)/u,
  );
  assert.match(extrasApp, /\.\.\.\(chapterId \? \{ chapterId \} : \{\}\)/u);
  assert.match(extrasApp, /\.\.\.\(versionId \? \{ versionId \} : \{\}\)/u);
});

test('going back to the chapter generate page keeps the rewrite target', () => {
  assert.match(
    extrasApp,
    /const chapterId = route\.value\.params\?\.chapterId \|\| chapterGenerationState\.preview\?\.chapterId \|\| '';/u,
  );
  assert.match(extrasApp, /chapterId\s*\?\s*\{\s*bookId,\s*chapterId,/u);
});

test('saving a rewrite preview without its chapter never creates a new chapter', () => {
  assert.match(previewSession, /if \(preview\.mode === '重写当前章节' && !chapterId\) \{/u);
  assert.match(previewSession, /找不到要重写的章节，无法保存为新版本/u);
  const guardIndex = previewSession.indexOf('无法保存为新版本');
  const saveIndex = previewSession.indexOf('saveExtraChapterPreview(options.store');
  assert.ok(guardIndex > -1 && saveIndex > guardIndex, 'the guard must run before saving');
});
