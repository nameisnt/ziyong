/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const theaterApp = await readFile(new URL('../../src/apps/theater/TheaterApp.vue', import.meta.url), 'utf8');

test('the theater preview normalizer keeps the rewrite target', () => {
  assert.match(
    theaterApp,
    /function normalizeTheaterPreview\(\s*preview: TheaterPreview,\s*routeParams: Record<string, string>,?\s*\): TheaterPreview \{/u,
  );
  assert.match(theaterApp, /if \(preview\.mode !== 'rewrite'\) return preview;/u);
  assert.match(theaterApp, /targetEntryId: preview\.targetEntryId \|\| routeParams\.rewriteEntryId \|\| ''/u);
  assert.match(theaterApp, /targetVersionId: preview\.targetVersionId \|\| routeParams\.versionId \|\| ''/u);
});

test('the theater preview draft saves and restores the rewrite route parameters', () => {
  assert.match(
    theaterApp,
    /normalizePreview: \(preview, routeParams\) => normalizeTheaterPreview\(preview, routeParams\)/u,
  );
  assert.match(theaterApp, /rewriteEntryId: route\.value\.params\.rewriteEntryId/u);
  assert.match(theaterApp, /versionId: route\.value\.params\.versionId/u);
});

test('going back to the generate page keeps the rewrite target', () => {
  assert.match(
    theaterApp,
    /const targetEntryId = preview\?\.targetEntryId \|\| route\.value\.params\?\.rewriteEntryId \|\| '';/u,
  );
  assert.match(theaterApp, /找不到要重写的小剧场，无法保留重写状态/u);
  assert.match(theaterApp, /\.\.\.\(targetEntryId \? \{ rewriteEntryId: targetEntryId \} : \{\}\)/u);
});

test('saving a rewrite preview without its target never creates a new entry', () => {
  assert.match(
    theaterApp,
    /if \(preview\.mode === 'rewrite' && !preview\.targetEntryId\) \{\s*toastr\.warning\('找不到要重写的小剧场，无法保存为新版本'\);\s*return;\s*\}/u,
  );
});
