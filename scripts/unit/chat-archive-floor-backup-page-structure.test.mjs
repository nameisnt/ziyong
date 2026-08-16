/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/components/ChatArchiveApp.vue', import.meta.url), 'utf8');
const page = await readFile(new URL('../../src/components/archive/ChatArchiveFloorBackupPage.vue', import.meta.url), 'utf8');

test('ChatArchive delegates the floor backup reader view while retaining its transactions', () => {
  assert.match(root, /import ChatArchiveFloorBackupPage from '@\/components\/archive\/ChatArchiveFloorBackupPage\.vue'/u);
  assert.match(
    root,
    /<ChatArchiveFloorBackupPage[\s\S]*route\.page === 'floor-backup'[\s\S]*:backup="selectedFloorBackup"[\s\S]*:export-backup="exportSelectedFloorBackup"[\s\S]*:restore-backup="restoreSelectedFloorBackup"/u,
  );

  for (const legacyView of ['pc-floor-message-list', 'pc-floor-backup-footer', 'getBackupReasoning']) {
    assert.doesNotMatch(root, new RegExp(legacyView, 'u'), `${legacyView} leaked back into ChatArchiveApp`);
    assert.match(page, new RegExp(legacyView, 'u'), `${legacyView} is missing from the floor backup page`);
  }

  assert.match(page, /extractMessageReasoning/u);
  assert.match(page, /props\.exportBackup/u);
  assert.match(page, /props\.restoreBackup/u);
  for (const retainedTransaction of [
    'exportSelectedFloorBackup',
    'restoreSelectedFloorBackup',
    'restoreFloorBackup',
    'downloadChatFloorBackup',
    'restoreChatFloorBackupToCurrent',
  ]) {
    assert.match(root, new RegExp(retainedTransaction, 'u'), `${retainedTransaction} left the root transaction owner`);
  }
});
