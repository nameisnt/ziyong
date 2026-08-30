/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const presetSource = await readFile(new URL('../../src/apps/preset-link/store.ts', import.meta.url), 'utf8');
const worldbookSource = await readFile(new URL('../../src/apps/worldbook-link/store.ts', import.meta.url), 'utf8');

test('preset scope switching serializes external changes and coalesces to the latest request', () => {
  assert.match(presetSource, /let presetMutationTail: Promise<void> = Promise\.resolve\(\)/u);
  assert.match(presetSource, /let pendingScopeRequest: PresetScopeRequest \| null = null/u);
  assert.match(presetSource, /while \(pendingScopeRequest\)/u);
  assert.match(presetSource, /pendingScopeRequest = \{ scopeKey, sequence: \+\+scopeSequence \}/u);
  assert.match(presetSource, /enqueuePresetMutation/u);
});

test('stale preset applications stop before regex reload and success state', () => {
  const method = presetSource.match(/async function applyPresetSelection[\s\S]*?\n {2}\}/u)?.[0] ?? '';
  assert.match(method, /if \(!isCurrent\(\)\) \{[\s\S]*return \{ applied: false/u);
  assert.match(method, /await loadTavernPreset\(presetName\)[\s\S]*if \(!isCurrent\(\)\)/u);
  assert.match(method, /await reloadCurrentChatForPresetRegex\(\)[\s\S]*if \(!isCurrent\(\)\)/u);
  assert.match(method, /applied: true/u);
});

test('worldbook scope switching uses one serialized worker and one latest pending request', () => {
  assert.match(worldbookSource, /let worldbookMutationTail: Promise<void> = Promise\.resolve\(\)/u);
  assert.match(worldbookSource, /let pendingScopeRequest: WorldbookScopeRequest \| null = null/u);
  assert.match(worldbookSource, /while \(pendingScopeRequest\)/u);
  assert.match(worldbookSource, /pendingScopeRequest = \{ scopeKey, sequence: \+\+scopeSequence \}/u);
  assert.match(worldbookSource, /enqueueWorldbookMutation/u);
});

test('worldbook reconciliation checks the latest scope between individual books', () => {
  const method = worldbookSource.match(/async function applyScopeNow[\s\S]*?\n {2}\}/u)?.[0] ?? '';
  assert.match(method, /if \(!isCurrent\(\)\) return false/u);
  assert.match(method, /await restoreBaselineNow\(bookName, isCurrent\)/u);
  assert.match(method, /await applyProfileNow\(scopeKey, bookName, isCurrent\)/u);
  assert.match(method, /return true/u);
});
