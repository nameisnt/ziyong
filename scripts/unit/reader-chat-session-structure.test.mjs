/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/reader/ReaderApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/apps/reader/useReaderChatSession.ts', import.meta.url), 'utf8');

test('ReaderApp delegates chat loading to one session while detail writes stay in the root coordinator', () => {
  assert.match(root, /import \{ useReaderChatSession \} from '@\/apps\/reader\/useReaderChatSession'/u);
  assert.match(
    root,
    /useReaderChatSession\(\{[\s\S]*activeBodyRule,[\s\S]*activeTitleRule,[\s\S]*applyReaderCleanupRules,[\s\S]*contentRuleId,[\s\S]*getCharacterRecords:[\s\S]*getCharacters,[\s\S]*getPastCharacterChats,[\s\S]*normalizeTitle,[\s\S]*readerSettings,[\s\S]*syncCurrentTavernPresetName,[\s\S]*\}\)/u,
  );

  for (const legacyOwner of [
    'loadedScopeKey',
    'readerLoadSerial',
    'loadViewingSourceMessages',
    'loadHistoryMessagesFromViewingScope',
    'isHistoryBriefMatch',
    'resolveViewingCharacterId',
  ]) {
    assert.doesNotMatch(root, new RegExp(`(?:const|let|function|async function) ${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into ReaderApp`);
    assert.match(owner, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the chat session owner`);
  }

  for (const runtimeCall of ['getPastCharacterChats', 'getChatHistoryDetailSafe']) {
    assert.doesNotMatch(root, new RegExp(`\\b${runtimeCall}\\(`, 'u'), `${runtimeCall} call leaked back into ReaderApp`);
    assert.match(owner, new RegExp(`\\b${runtimeCall}\\b`, 'u'), `${runtimeCall} is missing from the chat session owner`);
  }

  assert.match(root, /async function saveReaderReasoning[\s\S]*getChatMessagesSafe\('0-\{\{lastMessageId\}\}'/u);
  assert.match(owner, /getChatMessagesSafe\('0-\{\{lastMessageId\}\}'/u);

  assert.match(owner, /loadSerial !== readerLoadSerial/u);
  assert.match(owner, /phone\.viewingScopeKey !== scopeKeyAtStart/u);
  assert.match(owner, /phone\.replacePage\('detail'/u);
});
