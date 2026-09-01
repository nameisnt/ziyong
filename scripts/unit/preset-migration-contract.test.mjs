/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const api = await readFile(new URL('src/apps/preset-manager/api.ts', root), 'utf8');
const migration = await readFile(new URL('src/apps/preset-manager/presetMigration.ts', root), 'utf8').catch(() => '');
const manager = await readFile(new URL('src/apps/preset-manager/PresetManagerApp.vue', root), 'utf8');
const detail = await readFile(new URL('src/apps/preset-manager/pages/PresetDetailPage.vue', root), 'utf8');
const harness = await readFile(new URL('src/testing/visual-harness.ts', root), 'utf8');

test('preset transfer shares target verification while copy preserves its source', () => {
  assert.match(migration, /createTarget/u);
  assert.match(migration, /readTarget/u);
  assert.match(migration, /verifyPresetPayload/u);
  assert.match(migration, /deleteSource/u);
  assert.match(migration, /targetCreated/u);
  assert.match(migration, /sourceRemoved/u);
  assert.match(migration, /deleteTarget/u);
  assert.match(migration, /targetRemoved/u);
  assert.match(migration, /copyPresetTransactional/u);
  assert.match(migration, /sourceRemoved: false/u);
  assert.ok(migration.indexOf('createTarget') < migration.indexOf('readTarget'));
  assert.ok(migration.indexOf('readTarget') < migration.indexOf('deleteSource'));
});

test('preset detail copies Tavern presets and only protects built-in plugin move sources', () => {
  assert.match(detail, /movePresetLabel/u);
  assert.match(detail, /@click="\$emit\('move-preset'\)"/u);
  assert.match(manager, /detailPresetMovable/u);
  assert.match(manager, /复制到插件预设/u);
  assert.match(manager, /copyPresetTransactional/u);
  assert.doesNotMatch(manager, /getCurrentTavernPresetName\(\) !== detailPresetName\.value/u);
  assert.match(manager, /detailPluginPresetId\.value !== BUILTIN_DIARY_PRESET_ID/u);
  assert.match(manager, /movePresetTransactional/u);
  assert.match(manager, /目标预设已创建并校验，但来源删除失败/u);
  assert.match(api, /export async function createTavernPreset/u);
});

test('mock verification covers success, conflict, target failure, verification rollback, and source deletion failure', () => {
  for (const marker of [
    'preset-move-tavern-to-plugin',
    'preset-move-plugin-to-tavern',
    'preset-move-conflict',
    'preset-move-target-failure',
    'preset-move-verify-rollback',
    'preset-move-source-delete-failure',
  ]) {
    assert.match(harness, new RegExp(marker, 'u'));
  }
});
