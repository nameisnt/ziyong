/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [types, backup, policy, settingsPage] = await Promise.all([
  readFile(new URL('../../src/type/backup.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/util/backup.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/util/backupPolicy.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/settings/SettingsDataManagementPage.vue', import.meta.url), 'utf8'),
]);

test('full backup schema accepts only current version four', () => {
  assert.match(types, /backupKind: z\.literal\('full'\)[\s\S]*schemaVersion: z\.literal\(4\)/u);
  assert.doesNotMatch(types, /PhoneBackupFullDataV[23]Schema|PhoneBackupLegacyDataSchema/u);
  assert.doesNotMatch(types, /schemaVersion: z\.literal\([123]\),[\s\S]*backupKind: z\.literal\('full'\)/u);
  assert.doesNotMatch(types, /getPhoneBackupKind|\| 'legacy'/u);
  assert.match(backup, /schemaVersion: 4/u);
});

test('imports reject non-current kinds and domain versions without compatibility switches', () => {
  assert.doesNotMatch(policy, /allowLegacy|'legacy'/u);
  assert.doesNotMatch(backup, /allowLegacy|migrateImport!/u);
  assert.match(backup, /sourceVersion !== entry\.domain\.schemaVersion/u);
  assert.doesNotMatch(settingsPage, /getPhoneBackupKind|allowLegacy|旧版备份缺少文件类型/u);
});
