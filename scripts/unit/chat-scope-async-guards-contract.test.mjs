/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mvuSource = await readFile(new URL('../../src/apps/mvu-modifier/MvuModifierApp.vue', import.meta.url), 'utf8');
const worldbookSource = await readFile(
  new URL('../../src/apps/worldbook-link/WorldbookLinkApp.vue', import.meta.url),
  'utf8',
);

test('MVU loading coalesces requests and rejects results from a previous chat context', () => {
  assert.match(mvuSource, /let mvuLoadWorker: Promise<void> \| null = null/u);
  assert.match(mvuSource, /mvuLoadPending = true/u);
  assert.match(mvuSource, /while \(mvuLoadPending\)/u);
  assert.match(mvuSource, /isMvuContextCurrent\(requestVersion, requestScopeKey\)/u);
  assert.match(mvuSource, /const requestOptions = currentOptions\.value/u);
});

test('MVU reloads only after the shared chat scope has settled', () => {
  assert.match(mvuSource, /\(\) => phone\.currentTavernScopeKey/u);
  assert.doesNotMatch(mvuSource, /onTavernEvent\('CHAT_CHANGED'/u);
});

test('MVU persistence cannot commit UI state after its chat context becomes stale', () => {
  const method = mvuSource.match(/async function persistSnapshot[\s\S]*?\n\}/u)?.[0] ?? '';
  assert.match(method, /const requestVersion = contextVersion\.value/u);
  assert.match(method, /const requestScopeKey = activeChatKey\.value/u);
  assert.match(method, /if \(!isMvuContextCurrent\(requestVersion, requestScopeKey\)\) return false/u);
});

test('worldbook entry loading captures the route identity and rejects stale responses', () => {
  assert.match(worldbookSource, /let entryLoadRevision = 0/u);
  assert.match(worldbookSource, /function isEntryEditorRequestCurrent/u);
  const method = worldbookSource.match(/async function loadEntryEditor[\s\S]*?\n\}/u)?.[0] ?? '';
  assert.match(method, /const requestId = \+\+entryLoadRevision/u);
  assert.match(method, /const scopeKey = currentScopeKey\.value/u);
  assert.match(method, /const bookName = detailBookName\.value/u);
  assert.match(method, /const entryUid = editingEntryUid\.value/u);
  assert.match(method, /if \(!isEntryEditorRequestCurrent\(/u);
});

test('worldbook entry saves keep their captured book target and ignore stale UI completion', () => {
  const method = worldbookSource.match(/async function saveEditingEntry[\s\S]*?\n\}/u)?.[0] ?? '';
  assert.match(method, /const bookName = detailBookName\.value/u);
  assert.match(method, /updateWorldbookEntry\(bookName, entry\.uid, patch\)/u);
  assert.match(method, /if \(!isEntryEditorRequestCurrent\(/u);
});
