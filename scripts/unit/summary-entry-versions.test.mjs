/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const typeFile = readFileSync('src/type/summary.ts', 'utf8');
const storeFile = readFileSync('src/store/summary.ts', 'utf8');
const generationFile = readFileSync('src/core/summaryGeneration.ts', 'utf8');
const appFile = readFileSync('src/apps/summary/SummaryApp.vue', 'utf8');
const actionsFile = readFileSync('src/apps/summary/useSummaryGenerationActions.ts', 'utf8');
const detailFile = readFileSync('src/apps/summary/SummaryEntryDetailPage.vue', 'utf8');

test('summary entries carry the same version fields as the other writing apps', () => {
  assert.match(typeFile, /SummaryEntryVersionSchema = ContentVersionBaseSchema\.extend\(/u);
  assert.match(typeFile, /activeVersionId: z\.string\(\)\.default\(''\)/u);
  assert.match(typeFile, /versions: z\.array\(SummaryEntryVersionSchema\)\.default\(\[\]\)/u);
});

test('summary store migrates old entries and exposes the shared version operations', () => {
  assert.match(storeFile, /ensureContentVersions</u);
  assert.match(storeFile, /'summary_version'/u);
  assert.match(storeFile, /appendContentVersion<SummaryEntryVersion>\(entry, 'summary_version'/u);
  assert.match(storeFile, /export function appendEntryVersion|function appendEntryVersion/u);
  assert.match(storeFile, /function activateEntryVersion/u);
  assert.match(storeFile, /function updateEntryVersion/u);
  assert.match(storeFile, /function deleteEntryVersion/u);
  assert.match(storeFile, /migrateOriginalUsage\('summary', entry\.id, versions\)/u);
});

test('summary generation save appends a version when the draft targets an entry', () => {
  assert.match(generationFile, /entryId: z\.string\(\)\.default\(''\)/u);
  assert.match(generationFile, /versionId: z\.string\(\)\.default\(''\)/u);
  assert.match(generationFile, /config\.entryId/u);
  assert.match(generationFile, /appendEntryVersion\(/u);
  assert.match(generationFile, /目标总结条目已不存在，无法保存为新版本/u);
});

test('summary app keeps the rewrite target through preview, save, and failed-draft reparse', () => {
  assert.match(actionsFile, /action: entryId \? 'rewrite' : 'generate'/u);
  assert.match(appFile, /summary\.appendEntryVersion\(bookId, preview\.targetEntryId/u);
  assert.match(appFile, /readFailedDraftTarget\(draft\.context\)/u);
  assert.match(appFile, /action: isRewrite \? 'rewrite' : 'generate'/u);
  assert.match(appFile, /restoreGenerationReplayDraft\(replay, generationDraft\)/u);
  assert.match(appFile, /resolveGenerationReplayReferences\(replay\)/u);
  assert.match(appFile, /deleteContentVersionWithConfirmation\(/u);
});

test('summary detail page offers version navigation and a rewrite action', () => {
  assert.match(detailFile, /VersionNavigator/u);
  assert.match(detailFile, /:display-versions="versions"/u);
  assert.match(detailFile, /emit\('rewrite'\)/u);
  assert.match(detailFile, /versions\.length > 1/u);
});
