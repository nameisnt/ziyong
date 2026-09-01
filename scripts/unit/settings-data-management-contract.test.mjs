/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const phoneOverlay = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const settingsApp = await readFile(new URL('../../src/apps/settings/SettingsApp.vue', import.meta.url), 'utf8');
const dataManagement = await readFile(
  new URL('../../src/apps/settings/SettingsDataManagementPage.vue', import.meta.url),
  'utf8',
);
const favoritesStore = await readFile(new URL('../../src/store/favorites.ts', import.meta.url), 'utf8');

test('settings data management uses one current/all table without an app transfer selector', () => {
  assert.doesNotMatch(phoneOverlay, /aria-label="内容迁移"|ContentTransferOverlay|getAppContentTransferDomains/u);
  assert.match(settingsApp, /id: 'data', label: '数据'/u);
  assert.match(settingsApp, /currentRoute\.page === 'data'/u);
  assert.match(settingsApp, /activeSettingsTab === 'data'/u);
  assert.match(settingsApp, /SettingsDataManagementPage/u);
  assert.doesNotMatch(dataManagement, /ContentTransferOverlay|SearchableCombobox|getAppContentTransferDomains/u);
  assert.match(dataManagement, />App</u);
  assert.match(dataManagement, />当前</u);
  assert.match(dataManagement, />全部</u);
  assert.match(dataManagement, /domain\.current\.items/u);
  assert.match(dataManagement, /domain\.overview\.items/u);
});

test('backup and restore actions move together and keep their explicit labels', () => {
  for (const label of ['导出全部', '导出当前', '导入当前', '完整恢复']) {
    assert.doesNotMatch(settingsApp, new RegExp(label, 'u'));
    assert.match(dataManagement, new RegExp(label, 'u'));
  }
  assert.match(dataManagement, /downloadPhoneBackup/u);
  assert.match(dataManagement, /downloadCurrentChatPhoneBackup/u);
  assert.match(dataManagement, /importPhoneBackupScopeToCurrentChat/u);
  assert.match(dataManagement, /applyPhoneBackup/u);
});

test('backup rehydration can reset transient favorites selection state', () => {
  assert.match(dataManagement, /favorites\.clearSelection\(\)/u);
  assert.match(favoritesStore, /function clearSelection\(\)/u);
  assert.match(favoritesStore, /filter\.value = 'all'/u);
  assert.match(favoritesStore, /query\.value = ''/u);
  assert.match(favoritesStore, /listScrollTop\.value = 0/u);
  assert.match(favoritesStore, /clearSelection,/u);
});
