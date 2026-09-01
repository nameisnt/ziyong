/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/reader/ReaderApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/apps/reader/useReaderChatSession.ts', import.meta.url), 'utf8');
const library = await readFile(new URL('../../src/apps/reader/useReaderLibrarySession.ts', import.meta.url), 'utf8');

test('ReaderApp delegates chat loading to one session while detail writes stay in the root coordinator', () => {
  assert.match(root, /import \{ useReaderChatSession, type ReaderChatTarget \} from '@\/apps\/reader\/useReaderChatSession'/u);
  assert.match(
    root,
    /useReaderChatSession\(\{[\s\S]*activeBodyRule,[\s\S]*activeTitleRule,[\s\S]*applyReaderCleanupRules,[\s\S]*contentRuleId,[\s\S]*getPastCharacterChats,[\s\S]*normalizeTitle,[\s\S]*readerSettings,[\s\S]*syncCurrentTavernPresetName,[\s\S]*target: selectedReaderTarget,[\s\S]*\}\)/u,
  );

  for (const legacyOwner of [
    'loadedScopeKey',
    'readerLoadSerial',
    'loadViewingSourceMessages',
    'loadHistoryMessagesFromTarget',
    'isHistoryBriefMatch',
  ]) {
    assert.doesNotMatch(
      root,
      new RegExp(`(?:const|let|function|async function) ${legacyOwner}\\b`, 'u'),
      `${legacyOwner} leaked back into ReaderApp`,
    );
    assert.match(
      owner,
      new RegExp(`\\b${legacyOwner}\\b`, 'u'),
      `${legacyOwner} is missing from the chat session owner`,
    );
  }

  for (const runtimeCall of ['getPastCharacterChats', 'getChatHistoryDetailSafe']) {
    assert.doesNotMatch(
      root,
      new RegExp(`\\b${runtimeCall}\\(`, 'u'),
      `${runtimeCall} call leaked back into ReaderApp`,
    );
    assert.match(
      owner,
      new RegExp(`\\b${runtimeCall}\\b`, 'u'),
      `${runtimeCall} is missing from the chat session owner`,
    );
  }

  assert.match(root, /async function saveReaderReasoning[\s\S]*getChatMessagesSafe\('0-\{\{lastMessageId\}\}'/u);
  assert.match(owner, /getChatMessagesSafe\('0-\{\{lastMessageId\}\}'/u);

  assert.match(owner, /loadSerial !== readerLoadSerial/u);
  assert.match(owner, /options\.target\.value\?\.scopeKey !== scopeKeyAtStart/u);
  assert.match(owner, /phone\.replacePage\('detail'/u);
});

test('Reader library loads character shelves and chat books lazily without switching the phone viewing scope', () => {
  assert.match(root, /useReaderLibrarySession/u);
  assert.match(root, /route\.page === 'shelf'/u);
  assert.match(root, /route\.page === 'catalog'/u);
  assert.match(library, /async function loadOwners/u);
  assert.match(library, /async function loadBooks/u);
  assert.match(library, /getPastCharacterChats\(owner\.characterId\)/u);
  assert.match(library, /getOptionalGlobalValue<[\s\S]*>\('SillyTavern'\)\?\.getContext\?\.\(\)/u);
  assert.match(library, /currentCharacterId\.value === owner\.characterId/u);
  assert.match(library, /chatId: context\?\.chatId \?\? currentScope\.value\.chatId/u);
  assert.match(root, /currentChatId: currentReaderChatId/u);
  assert.match(library, /title: normalizeChatArchiveId\(brief\.title\) \|\| chatId/u);
  assert.doesNotMatch(root, /phone\.setViewingScope/u);
  assert.doesNotMatch(library, /phone\.setViewingScope/u);
});
