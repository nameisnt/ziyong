/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('settings owns its root, compact categories and external API subpage while services remain shared', async () => {
  const files = (await readdir(new URL('../../src/apps/settings/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'SettingsAdvancedPanel.vue',
    'SettingsApp.vue',
    'SettingsConnectionPanel.vue',
    'SettingsDataManagementPage.vue',
    'SettingsExternalApiPage.vue',
    'SettingsGenerationPanel.vue',
    'SettingsInterfacePanel.vue',
    'SettingsReaderPanel.vue',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/settings/SettingsApp.vue');
  const advanced = await source('src/apps/settings/SettingsAdvancedPanel.vue');
  const dataManagement = await source('src/apps/settings/SettingsDataManagementPage.vue');
  const interfacePanel = await source('src/apps/settings/SettingsInterfacePanel.vue');
  const appRoot = await source('src/App.vue');

  assert.match(builtin, /import\('@\/apps\/settings\/SettingsApp\.vue'\)/u);
  assert.match(root, /from '\.\/SettingsAdvancedPanel\.vue'/u);
  assert.match(root, /from '\.\/SettingsDataManagementPage\.vue'/u);
  assert.match(advanced, /executePhoneAppResetTransaction/u);
  assert.match(advanced, /clearAllPhoneGeneratedContent/u);
  assert.match(dataManagement, /applyPhoneBackup/u);
  assert.match(dataManagement, /downloadPhoneBackup/u);
  assert.match(dataManagement, /importPhoneBackupScopeToCurrentChat/u);
  assert.match(interfacePanel, /@click="restoreHomeLayout"/u);
  assert.match(interfacePanel, /settingsStore\.resetHomeLayout\(\)/u);
  assert.match(interfacePanel, /toastr\.success\('主页布局已恢复默认'\)/u);
  assert.doesNotMatch(appRoot, /extensions_settings2|@\/Panel\.vue|<Panel/u);
  assert.match(appRoot, /#pc_reader_wand_container/u);

  await access(new URL('../../src/util/backup.ts', import.meta.url));
  await access(new URL('../../src/util/settingsResetTransaction.ts', import.meta.url));
  await assert.rejects(access(new URL('../../src/Panel.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/SettingsApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/settings/', import.meta.url)));
});
