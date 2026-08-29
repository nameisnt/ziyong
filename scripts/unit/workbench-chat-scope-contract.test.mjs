/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [store, appModule, component, modal, chatScoped, catalog, scenario] = await Promise.all([
  readFile(new URL('../../src/apps/workbench/store.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/workbench/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/workbench/WorkbenchApp.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/workbench/WorkbenchCopyModal.vue', import.meta.url), 'utf8'),
  readFile(new URL('../../src/store/chatScoped.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/testing/visual/workbenchScenarios.ts', import.meta.url), 'utf8'),
]);

test('workbench stores complete settings in the shared chat-scoped domain and discards legacy globals', () => {
  assert.match(store, /useChatScopedDomain\(\{/u);
  assert.match(store, /discardLegacyGlobalWorkbenchSettings/u);
  assert.match(store, /scopes:\s*\{\}/u);
  assert.match(store, /task\.kind === 'workbench'/u);
  assert.match(appModule, /scopeSwitchHandler/u);
  assert.match(appModule, /scope:\s*'chat'/u);
  assert.match(appModule, /schemaVersion:\s*3/u);
  assert.match(chatScoped, /function getScopeData/u);
  assert.match(chatScoped, /const scopeKeys = computed/u);
});

test('cross-chat workflow copies are disabled and clear chat-specific targets and identities', () => {
  assert.match(store, /function copyWorkflowsFromScope/u);
  assert.match(store, /enabled:\s*false/u);
  for (const field of [
    'diaryBookId',
    'diaryPerspectiveName',
    'extrasBookId',
    'forumBoardId',
    'letterBookId',
    'letterReceiverName',
    'letterSenderName',
    'profileSheetKey',
    'relationshipCharacterNames',
    'summaryBookId',
    'theaterParticipants',
  ]) {
    assert.match(store, new RegExp(`${field}: ''`, 'u'));
  }
  assert.match(store, /pendingRuns:\s*\{\}/u);
  assert.match(component, /复制其他聊天的工作流/u);
  assert.match(modal, /复制到当前聊天/u);
});

test('workbench copy has a real browser interaction scenario', () => {
  assert.match(catalog, /workbench-copy/u);
  assert.match(catalog, /workbench-copy-dark/u);
  assert.match(scenario, /name === 'workbench-copy'.*name === 'workbench-copy-dark'/u);
  assert.match(scenario, /pc-workbench-copy-list input/u);
  assert.match(scenario, /copied\.enabled/u);
});
