/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readSource(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const [model, store, backup, manager, catalog, detail, provider, settings, workbench] = await Promise.all([
  readSource('src/apps/preset-manager/pluginPreset.ts'),
  readSource('src/store/pluginPresets.ts'),
  readSource('src/type/backup.ts'),
  readSource('src/apps/preset-manager/PresetManagerApp.vue'),
  readSource('src/apps/preset-manager/pages/PresetCatalogPage.vue'),
  readSource('src/apps/preset-manager/pages/PresetDetailPage.vue'),
  readSource('src/components/GenerationProviderFields.vue'),
  readSource('src/components/settings/SettingsConnectionPanel.vue'),
  readSource('src/apps/workbench/WorkbenchApp.vue'),
]);

test('plugin preset visibility is optional and round-trips through index, files, and full backups', () => {
  assert.match(model, /hidden\?: boolean/u);
  assert.match(backup, /PluginPresetBackupRecordSchema[\s\S]*?hidden:\s*z\.boolean\(\)\.optional\(\)/u);
  assert.match(store, /hidden:\s*item\.hidden === true/u);
  assert.match(store, /version:\s*4/u);
  assert.match(store, /async function setHidden/u);
  assert.match(store, /getDefaultAppIds\(id\)/u);
  assert.match(store, /内置插件预设/u);
});

test('preset manager can reveal hidden records and toggle only built-in preset visibility', () => {
  assert.match(catalog, /v-model[^\n]*show-hidden|defineModel<boolean>\('showHidden'/u);
  assert.match(catalog, /preset\.hidden/u);
  assert.match(catalog, /显示隐藏预设/u);
  assert.match(detail, /取消隐藏|隐藏预设/u);
  assert.match(detail, /toggle-preset-visibility/u);
  assert.match(manager, /togglePresetVisibility/u);
  assert.match(manager, /setHidden/u);
});

test('all plugin-preset generation selectors use the shared visibility options', () => {
  for (const source of [provider, settings, workbench]) {
    assert.match(source, /buildPluginPresetSelectionOptions/u);
    assert.doesNotMatch(source, /pluginPresetItems\.value\.map\(preset/u);
  }
});
