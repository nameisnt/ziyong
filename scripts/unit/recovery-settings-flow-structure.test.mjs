/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = await readFile(new URL('../../src/apps/recovery/RecoveryApp.vue', import.meta.url), 'utf8');
const owner = await readFile(new URL('../../src/apps/recovery/RecoverySettingsFlow.vue', import.meta.url), 'utf8');

test('RecoveryApp delegates settings snapshot list and duplicate cleanup to one page owner', () => {
  assert.match(root, /import RecoverySettingsFlow from '@\/apps\/recovery\/RecoverySettingsFlow\.vue'/u);
  assert.match(
    root,
    /<RecoverySettingsFlow[\s\S]*\['settings-snapshots', 'settings-duplicates'\]\.includes\(route\.page\)[\s\S]*:format-bytes="formatBytes"[\s\S]*:format-date="formatDate"/u,
  );

  for (const legacyOwner of [
    "route.page === 'settings-snapshots'",
    "route.page === 'settings-duplicates'",
    'settingsDuplicateSelectedNames',
    'settingsDuplicateCandidateCount',
    'settingsDuplicateScanButtonLabel',
    'refreshSettingsSnapshots',
    'confirmMakeSettingsSnapshot',
    'confirmRestoreSettingsSnapshot',
    'confirmDeleteSettingsSnapshot',
    'openSettingsDuplicates',
    'scanSettingsDuplicates',
    'toggleSettingsDuplicateCandidate',
    'confirmSettingsDuplicateDelete',
  ]) {
    assert.doesNotMatch(
      root,
      new RegExp(legacyOwner.replaceAll('.', '\\.').replaceAll('(', '\\('), 'u'),
      `${legacyOwner} leaked back into RecoveryApp`,
    );
    assert.match(
      owner,
      new RegExp(legacyOwner.replaceAll('.', '\\.').replaceAll('(', '\\('), 'u'),
      `${legacyOwner} is missing from RecoverySettingsFlow`,
    );
  }

  assert.match(root, /function openSettingsSnapshots\(\)[\s\S]*phone\.pushPage\('settings-snapshots', '设置快照'\)/u);
  assert.match(owner, /useChatRecoveryStore\(\)/u);
  assert.match(owner, /恢复会用这份快照覆盖酒馆当前 settings\.json/u);
  assert.match(owner, /每组最新快照会保留/u);
});
