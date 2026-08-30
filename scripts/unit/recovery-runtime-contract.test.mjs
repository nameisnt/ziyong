/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const recoveryStoreSource = await readFile(new URL('../../src/store/recovery.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../../src/App.vue', import.meta.url), 'utf8');

test('recovery mutations own persistence without an automatic deep watcher', () => {
  assert.doesNotMatch(recoveryStoreSource, /\bwatch\s*\(/u);
  assert.match(recoveryStoreSource, /async function setRecovery[\s\S]*await persist\(nextData\)/u);
  assert.match(recoveryStoreSource, /async function deleteRecovery[\s\S]*await persist\(nextData\)/u);
  assert.match(recoveryStoreSource, /async function clearAllRecoveries[\s\S]*await persist\(nextData\)/u);
});

test('background recovery calls share one handled async boundary', () => {
  assert.match(appSource, /function scheduleCurrentScopeRecovery\(\)/u);
  assert.match(appSource, /void tryRecoverCurrentScope\(\)\.catch\(/u);
  assert.doesNotMatch(appSource, /void tryRecoverCurrentScope\(\);/u);
  assert.match(appSource, /scheduleCurrentScopeRecovery\(\);[\s\S]*CHAT_CHANGED[\s\S]*scheduleCurrentScopeRecovery\(\);/u);
});
