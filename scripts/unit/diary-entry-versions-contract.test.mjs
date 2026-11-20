/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const store = await readFile(new URL('../../src/store/diary.ts', import.meta.url), 'utf8');
const type = await readFile(new URL('../../src/type/diary.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../../src/apps/diary/DiaryApp.vue', import.meta.url), 'utf8');
const detail = await readFile(new URL('../../src/apps/diary/DiaryEntryDetailPage.vue', import.meta.url), 'utf8');

test('diary entries keep a version list and migrate existing entries', () => {
  assert.match(type, /activeVersionId: z\.string\(\)\.default\(''\)/u);
  assert.match(type, /versions: z\.array\(DiaryEntryVersionSchema\)\.default\(\[\]\)/u);
  assert.match(store, /normalizeEntryVersions/u);
  assert.match(store, /ensureContentVersions<DiaryEntryVersion>\(/u);
  assert.match(store, /normalizeDirectoryOrders\(\);\n\s*normalizeEntryVersions\(\);/u);
});

test('rewriting a diary appends a new version and activates it', () => {
  assert.match(store, /function appendEntryVersion/u);
  assert.match(store, /migrateOriginalUsage\('diary', entry\.id/u);
  assert.match(store, /entry\.activeVersionId = version\.id/u);
  assert.match(store, /function activateEntryVersion/u);
  assert.match(store, /function deleteEntryVersion/u);
});

test('the preview saves rewrites as versions instead of new entries', () => {
  assert.match(app, /if \(preview\.action === 'rewrite' && preview\.targetEntryId\)/u);
  assert.match(app, /diary\.appendEntryVersion\(preview\.bookId, preview\.targetEntryId/u);
  assert.match(app, /已保存为新版本/u);
});

test('generation snapshots the rewrite target before awaiting', () => {
  const snapshotIndex = app.indexOf('captureTarget: () => {');
  const runIndex = app.indexOf('run: target =>');
  assert.ok(snapshotIndex > 0, 'missing rewrite target snapshot');
  assert.ok(runIndex > snapshotIndex, 'snapshot must run before generation starts');
  assert.match(app, /entryId: route\.value\.params\?\.entryId \|\| ''/u);
  assert.match(app, /targetEntryId: target\.entryId/u);
});

test('the entry detail page exposes version navigation and rewrite', () => {
  assert.match(detail, /:display-versions="versions"/u);
  assert.match(detail, /:display-identity="\[entry\.id, viewedVersionId\]"/u);
  assert.match(detail, /#version-navigation/u);
  assert.match(detail, /emit\('rewrite'\)/u);
  assert.match(detail, /emit\('selectVersion', \$event\)/u);
});

test('rewriting refills the previous requirement, source, and references', () => {
  assert.match(app, /restoreGenerationReplayDraft\(replay, generationDraft\)/u);
  assert.match(app, /selectedReferences\.value = resolveGenerationReplayReferences\(replay\)/u);
  const watchIndex = app.indexOf("current.page === 'generate' && previous?.page !== 'preview'");
  const restoreIndex = app.indexOf('restoreGenerationReplayDraft(replay, generationDraft)');
  assert.ok(watchIndex > 0 && restoreIndex > watchIndex, 'rewrite refill must live in the generate page watch');
  const openRewrite = app.slice(app.indexOf('function openRewriteEntry'), app.indexOf('function selectEntryVersion'));
  assert.ok(!/replay\.config\.userRequirement/u.test(openRewrite), 'openRewriteEntry must not read the legacy config field');
});
