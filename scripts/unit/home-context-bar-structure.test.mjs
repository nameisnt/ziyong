/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const home = await readFile(new URL('../../src/components/PhoneHome.vue', import.meta.url), 'utf8');
const contextBar = await readFile(new URL('../../src/components/home/HomeContextBar.vue', import.meta.url), 'utf8');

test('HomeContextBar exclusively owns chat status markup styles and side effects', () => {
  for (const evidence of [
    '<section class="pc-home-context">',
    '<ActionMenu align="start" icon-only label="操作"',
    'const refreshingPhoneData = ref(false)',
    'async function jumpViewingChatToTavern()',
    'async function refreshPhoneData()',
    '.pc-home-context {',
    '.pc-home-context-copy {',
  ]) {
    assert.ok(contextBar.includes(evidence), `${evidence} is missing from HomeContextBar`);
    assert.ok(!home.includes(evidence), `${evidence} is duplicated in PhoneHome`);
  }
});

test('context bar uses three narrow one-way events without receiving writable home state', () => {
  assert.match(contextBar, /defineProps<\{\s*isOrganizing: boolean;/u);
  for (const eventName of ['open-folder-creator', 'refreshed', 'toggle-organizing']) {
    assert.match(contextBar, new RegExp(`'${eventName}'`, 'u'));
    assert.match(home, new RegExp(`@${eventName}=`, 'u'));
  }
  assert.doesNotMatch(contextBar, /appDrag|folderDrag|homeSwipe|homePageIndex|activeHomeFolderId|setHomeLayout/u);
  assert.match(home, /@refreshed="refreshHomeArchiveDomains"/u);
});

test('refresh and tavern jump preserve the established side effect order and parameters', () => {
  const refreshEvidence = [
    'settingsStore.rehydrateFromSettings();',
    'prompts.rehydrateFromSettings();',
    'bagu.rehydrateFromSettings();',
    'recovery.rehydrateFromSettings();',
    'reader.rehydrateFromSettings();',
    'generationTasks.rehydrateFromSettings();',
    'getRegisteredPhoneBackupRehydrateHandlers().forEach(handler => handler());',
    'stats.refresh();',
    'await nextTick();',
    "emit('refreshed');",
    "phone.noticeSuccess('插件数据已刷新');",
  ];
  let previousIndex = -1;
  for (const evidence of refreshEvidence) {
    const index = contextBar.indexOf(evidence);
    assert.ok(index > previousIndex, `${evidence} is missing or out of order`);
    previousIndex = index;
  }
  assert.match(
    contextBar,
    /jumpToTavernChat\(\{ chatFile: target\.chatId, characterId: target\.characterId, ownerName: target\.ownerName \}\)/u,
  );
  assert.match(contextBar, /phone\.closePhone\(\);\s*window\.setTimeout\(\(\) => void phone\.syncCurrentTavernScope\(true\), 2400\)/u);
});
