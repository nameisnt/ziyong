/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/recovery/RecoveryApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/apps/recovery/RecoveryReadImportFlow.vue', import.meta.url), 'utf8');

test('RecoveryApp delegates the complete read and import route flow to one page owner', () => {
  assert.match(root, /import RecoveryReadImportFlow from '@\/apps\/recovery\/RecoveryReadImportFlow\.vue'/u);
  assert.match(
    root,
    /<RecoveryReadImportFlow[\s\S]*\['reader', 'confirm', 'result'\]\.includes\(route\.page\)[\s\S]*:confirm-delete-backup="confirmDeleteBackup"[\s\S]*:format-date="formatDate"/u,
  );

  for (const legacyOwner of [
    'pc-recovery-reader-page',
    'pc-recovery-confirm-card',
    'pc-recovery-result-card',
    'messageIndex',
    'catalogOpen',
    'selectedTargetId',
    'openMessage',
    'selectCatalogMessage',
    'scrollReader',
    'openImportConfirm',
    'suggestedTargetId',
    'confirmImport',
    'openImportedChat',
  ]) {
    assert.doesNotMatch(root, new RegExp(legacyOwner, 'u'), `${legacyOwner} leaked back into RecoveryApp`);
    assert.match(owner, new RegExp(legacyOwner, 'u'), `${legacyOwner} is missing from RecoveryReadImportFlow`);
  }

  assert.match(owner, /useChatRecoveryStore\(\)/u);
  assert.match(owner, /jumpToTavernChat/u);
  assert.match(owner, /props\.confirmDeleteBackup/u);
});
