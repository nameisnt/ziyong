/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/ReaderApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/components/reader/useReaderTextEditSession.ts', import.meta.url), 'utf8');

test('ReaderApp delegates selected-text editing to one internal session', () => {
  assert.match(root, /import \{ useReaderTextEditSession \} from '@\/components\/reader\/useReaderTextEditSession'/u);
  assert.match(
    root,
    /useReaderTextEditSession\(\{[\s\S]*activeMessage,[\s\S]*activeMessages,[\s\S]*loadCurrentChat,[\s\S]*replaceReaderBodyInRaw,[\s\S]*saveChatIfAvailable,[\s\S]*\}\)/u,
  );

  for (const legacyOwner of [
    'readerTextEditOpen',
    'readerSelectedText',
    'readerTextOccurrences',
    'getReaderSelectionText',
    'deleteSelectedReaderText',
    'saveReaderSentenceEdit',
  ]) {
    assert.doesNotMatch(root, new RegExp(`(?:const|function) ${legacyOwner}\\b`, 'u'), `${legacyOwner} leaked back into ReaderApp`);
    assert.match(owner, new RegExp(`\\b${legacyOwner}\\b`, 'u'), `${legacyOwner} is missing from the session owner`);
  }

  assert.match(owner, /message\.sourceBody\.slice\(occurrence\.offset, occurrence\.offset \+ selectedText\.length\)/u);
  assert.match(owner, /phoneScopeChanged/u);
  assert.match(owner, /setChatMessagesSafe/u);
});
