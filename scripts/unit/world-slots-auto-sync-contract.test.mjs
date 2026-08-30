/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/world-slots/store.ts', import.meta.url), 'utf8');

test('world slot directory toggles persist the state and queue a worldbook sync', () => {
  const method = source.match(/function setSlotEnabled[\s\S]*?\n {2}\}/u)?.[0] ?? '';
  assert.match(method, /slot\.enabled = enabled/u);
  assert.match(method, /slot\.updatedAt = nowIso\(\)/u);
  assert.match(method, /queueAutoSync\(\)/u);
  assert.match(source, /setSlotEnabled,[\s\S]*slots,/u);
});

test('world slot scope switches wait for Tavern and retry the active chat sync', () => {
  const method = source.match(/async function syncScopeWithRetry[\s\S]*?\n {2}\}\n\n {2}function rehydrateFromSettings/u)?.[0] ?? '';
  assert.match(method, /scopeSyncSequence/u);
  assert.match(method, /attempt < 3/u);
  assert.match(method, /attempt === 0 \? 900 : 700/u);
  assert.match(method, /areChatScopeKeysEquivalent\(scopeKey\.value, targetScopeKey\)/u);
  assert.match(method, /areChatScopeKeysEquivalent\(targetScopeKey, getCurrentChatScopeKey\(\)\)/u);
  assert.match(method, /await syncToWorldBook\(\)/u);
  assert.match(method, /toastr\.warning/u);
  assert.match(source, /async function switchScope\(nextScopeKey: string\)[\s\S]*await syncScopeWithRetry\(scopeKey\.value\)/u);
});

test('stale world slot syncs stop before rebinding the shared worldbook', () => {
  assert.match(
    source,
    /await saveWorldInfo\(bookName, book, true\);[\s\S]*if \(!isRequestCurrent\(requestId, targetScopeKey\)\) return skippedResult\(\);[\s\S]*rebindGlobalWorldbooks/u,
  );
});
