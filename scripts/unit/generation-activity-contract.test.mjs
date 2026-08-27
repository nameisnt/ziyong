/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const registry = await readFile(new URL('../../src/core/appRegistry.ts', import.meta.url), 'utf8');
const tasks = await readFile(new URL('../../src/store/generationTasks.ts', import.meta.url), 'utf8');
const activity = await readFile(new URL('../../src/util/generationActivity.ts', import.meta.url), 'utf8');

test('recovery providers expose stable read-only items through the app registry', () => {
  assert.match(registry, /export interface PhoneGenerationRecoveryItem/u);
  assert.match(registry, /generationRecoveryProvider\?: PhoneGenerationRecoveryProvider/u);
  assert.match(registry, /getRegisteredPhoneGenerationRecoveryItems\(scopeKey: string\)/u);
  assert.match(registry, /unique\.set\(`\$\{item\.appId\}:\$\{item\.id\}`/u);
});

test('all terminal notifications can enter the shared clear operation', () => {
  assert.match(tasks, /export function isClearableGenerationNotification/u);
  assert.match(tasks, /terminalStatuses\.has\(task\.status\)/u);
  assert.match(tasks, /function clearCompletedNotifications/u);
  assert.doesNotMatch(tasks, /task\.draftCount === 0/u);
  assert.doesNotMatch(tasks, /config\.data\.resultState === 'saved'/u);
});

test('activity aggregation does not invent task-to-draft links', () => {
  assert.match(activity, /without guessing task\/draft relationships/u);
  assert.match(activity, /tasks\.filter\(isActiveTask\)/u);
  assert.match(activity, /drafts\.forEach/u);
  assert.match(activity, /recoveryItems\.forEach/u);
});
