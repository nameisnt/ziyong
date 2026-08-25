/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const phoneOverlay = await readFile(new URL('../../src/components/PhoneOverlay.vue', import.meta.url), 'utf8');
const settingsApp = await readFile(new URL('../../src/apps/settings/SettingsApp.vue', import.meta.url), 'utf8');
const settingsGeneral = await readFile(
  new URL('../../src/apps/settings/SettingsGeneralPanel.vue', import.meta.url),
  'utf8',
);
const dataManagement = await readFile(
  new URL('../../src/apps/settings/SettingsDataManagementPage.vue', import.meta.url),
  'utf8',
);

test('app-wide transfer is hosted by the settings data-management page instead of the phone topbar', () => {
  assert.doesNotMatch(phoneOverlay, /aria-label="内容迁移"|ContentTransferOverlay|getAppContentTransferDomains/u);
  assert.match(settingsGeneral, />数据管理</u);
  assert.match(settingsGeneral, /phone\.pushPage\('data', '数据管理'\)/u);
  assert.match(settingsApp, /currentRoute\.page === 'data'/u);
  assert.match(settingsApp, /SettingsDataManagementPage/u);
  assert.match(dataManagement, /ContentTransferOverlay/u);
  assert.match(dataManagement, /SearchableCombobox/u);
  assert.match(dataManagement, /getAppContentTransferDomains/u);
});

test('backup and restore actions move together and keep their explicit labels', () => {
  for (const label of ['导出全部', '导出当前', '导入当前', '完整恢复']) {
    assert.doesNotMatch(settingsGeneral, new RegExp(label, 'u'));
    assert.match(dataManagement, new RegExp(label, 'u'));
  }
  assert.match(dataManagement, /downloadPhoneBackup/u);
  assert.match(dataManagement, /downloadCurrentChatPhoneBackup/u);
  assert.match(dataManagement, /importPhoneBackupScopeToCurrentChat/u);
  assert.match(dataManagement, /applyPhoneBackup/u);
});
