/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entrySource = await readFile(new URL('../../src/apps/entry-library/store.ts', import.meta.url), 'utf8');
const slotStoreSource = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');
const slotAppSource = await readFile(new URL('../../src/apps/world-slots/WorldSlotsApp.vue', import.meta.url), 'utf8');

test('entry-library preset writes are globally serialized and repeated binding syncs are coalesced', () => {
  assert.match(entrySource, /let entryLibrarySyncTail: Promise<void> = Promise\.resolve\(\)/u);
  assert.match(entrySource, /const bindingSyncRevisions = new Map<string, number>\(\)/u);
  assert.match(entrySource, /const bindingSyncPromises = new Map<string, Promise<void>>\(\)/u);
  assert.match(entrySource, /while \(appliedRevision !== bindingSyncRevisions\.get\(bindingId\)\)/u);
  assert.match(entrySource, /entryLibrarySyncTail = task\.then/u);
});

test('world-slot auto-sync failures remain visible with a direct retry action', () => {
  assert.match(slotStoreSource, /syncError\.value = error instanceof Error \? error\.message : '同步失败'/u);
  assert.match(slotAppSource, /const \{ isCurrentChatScope, slots, syncError, syncStatus \} = storeToRefs\(worldSlots\)/u);
  assert.match(slotAppSource, /v-if="syncStatus === 'error' && syncError"/u);
  assert.match(slotAppSource, /role="alert"/u);
  assert.match(slotAppSource, /@click="syncSlots"/u);
});
