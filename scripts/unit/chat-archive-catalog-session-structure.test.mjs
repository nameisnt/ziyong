/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/ChatArchiveApp.vue', import.meta.url), 'utf8');
const session = await readFile(new URL('../../src/components/archive/useChatArchiveCatalogSession.ts', import.meta.url), 'utf8');

test('ChatArchive delegates catalog loading, grouping and selection to one internal session', () => {
  assert.match(
    root,
    /import \{[\s\S]*?useChatArchiveCatalogSession[\s\S]*?\} from '@\/components\/archive\/useChatArchiveCatalogSession'/u,
  );
  assert.match(root, /const \{[\s\S]*activeOwner[\s\S]*currentChatRow[\s\S]*loadCharacters[\s\S]*refreshSelectedChatRow[\s\S]*\} = useChatArchiveCatalogSession\(\)/u);

  for (const legacyOwner of [
    'interface ArchiveOwner',
    'interface ArchiveChatRow',
    'const owners = ref',
    'let characterLoadSequence',
    'async function loadCharacters',
    'async function loadChatsForActiveOwner',
    'function createChatRow',
    'function findChatScope',
    'function resolveCharacterAvatarUrl',
  ]) {
    assert.doesNotMatch(root, new RegExp(legacyOwner, 'u'), `${legacyOwner} leaked back into ChatArchiveApp`);
    assert.match(session, new RegExp(legacyOwner, 'u'), `${legacyOwner} is missing from the catalog session`);
  }

  for (const retainedTransaction of [
    'saveCurrentFloorBackup',
    'importFloorBackupFor',
    'restoreFloorBackup',
    'deleteSelectedFloorBackup',
    'renameSelectedChat',
    'migrateSelectedChatToCurrent',
  ]) {
    assert.match(root, new RegExp(`(?:async )?function ${retainedTransaction}`, 'u'));
    assert.doesNotMatch(session, new RegExp(`(?:async )?function ${retainedTransaction}`, 'u'));
  }
});
