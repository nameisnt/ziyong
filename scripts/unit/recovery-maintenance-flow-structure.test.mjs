/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/recovery/RecoveryApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/apps/recovery/RecoveryMaintenanceFlow.vue', import.meta.url), 'utf8');

test('RecoveryApp delegates duplicate and cleanup maintenance to one page owner', () => {
  assert.match(root, /import RecoveryMaintenanceFlow from '@\/apps\/recovery\/RecoveryMaintenanceFlow\.vue'/u);
  assert.match(
    root,
    /<RecoveryMaintenanceFlow[\s\S]*v-show="\['duplicates', 'cleanup'\]\.includes\(route\.page\)"[\s\S]*:format-backup-created-at="formatBackupCreatedAt"[\s\S]*:format-bytes="formatBytes"[\s\S]*:format-date="formatDate"[\s\S]*:open-backup="openBackup"/u,
  );

  for (const legacyOwner of [
    "route.page === 'duplicates'",
    "route.page === 'cleanup'",
    'cleanupThreshold',
    'cleanupSelectedNames',
    'duplicateSelectedNames',
    'containedSelectedNames',
    'toggleContainedCandidate',
    'selectAllDuplicateCandidates',
    'clearDuplicateCandidates',
    'confirmContainedDelete',
    'scanDuplicates',
    'duplicateGroupLabel',
    'toggleDuplicateCandidate',
    'confirmDuplicateDelete',
    'scanCleanup',
    'toggleCleanupCandidate',
    'confirmCleanupDelete',
  ]) {
    assert.doesNotMatch(
      root,
      new RegExp(legacyOwner.replaceAll('.', '\\.').replaceAll('(', '\\('), 'u'),
      `${legacyOwner} leaked back into RecoveryApp`,
    );
    assert.match(
      owner,
      new RegExp(legacyOwner.replaceAll('.', '\\.').replaceAll('(', '\\('), 'u'),
      `${legacyOwner} is missing from RecoveryMaintenanceFlow`,
    );
  }

  assert.match(owner, /useChatRecoveryStore\(\)/u);
  assert.match(owner, /props\.openBackup/u);
  assert.match(owner, /每组最新备份会保留/u);
  assert.match(owner, /page === 'duplicates' && !recovery\.duplicateScanResult/u);
  assert.match(owner, /page === 'cleanup' && !recovery\.cleanupScanResult/u);
});
