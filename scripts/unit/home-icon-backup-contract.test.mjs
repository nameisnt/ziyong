/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backupType = await readFile(new URL('../../src/type/backup.ts', import.meta.url), 'utf8');
const backupUtil = await readFile(new URL('../../src/util/backup.ts', import.meta.url), 'utf8');
const settingsType = await readFile(new URL('../../src/type/settings.ts', import.meta.url), 'utf8');
const settingsStore = await readFile(new URL('../../src/store/settings.ts', import.meta.url), 'utf8');
const appIcon = await readFile(new URL('../../src/components/AppIcon.vue', import.meta.url), 'utf8');

test('current full backup embeds icon bytes', () => {
  assert.match(backupType, /homeIconAssets:\s*z\.array\(HomeIconAssetBackupSchema\)/u);
  assert.match(backupUtil, /readHomeIconBackupAssets/u);
  assert.match(backupUtil, /homeIconAssets:\s*await readHomeIconBackupAssets/u);
});

test('current full backup embeds chat floor backups and associated worldbooks', () => {
  assert.match(backupType, /PhoneBackupFullDataSchema/u);
  assert.match(backupType, /schemaVersion:\s*z\.literal\(4\)/u);
  assert.match(backupUtil, /chatFloorBackups/u);
  assert.match(backupUtil, /readAssociatedWorldbooks/u);
  assert.match(backupUtil, /replaceChatFloorBackups/u);
  assert.match(backupUtil, /replaceWorldbooks/u);
});

test('icon import validates identity and rolls uploaded files back when commit fails', () => {
  assert.match(backupUtil, /图标资源清单与设置引用不一致/u);
  assert.match(backupUtil, /uploadedPaths\.push\(path\)/u);
  assert.match(backupUtil, /Promise\.all\(uploadedPaths\.map\(deleteImportedHomeIcon\)\)/u);
  assert.match(backupUtil, /executeBackupResourceTransaction/u);
});

test('settings keep stable icon assets and reject deletion while referenced', () => {
  assert.match(settingsType, /homeIconAssets:\s*z\.array\(HomeIconAssetSchema\)/u);
  assert.match(settingsType, /appIconAssetIds:\s*z\.record/u);
  assert.match(settingsType, /iconAssetId:\s*z\.string/u);
  assert.match(settingsStore, /getHomeIconAssetReferenceCount/u);
  assert.match(settingsStore, /解除引用后才能删除/u);
});

test('rendering keeps the font icon fallback when an imported image fails', () => {
  assert.match(appIcon, /@error="sourceFailed = true"/u);
  assert.match(appIcon, /<i v-else class="fa-solid"/u);
});
