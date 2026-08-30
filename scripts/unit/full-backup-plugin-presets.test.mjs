/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

async function readMaybe(url) {
  try {
    return await readFile(url, 'utf8');
  } catch {
    return '';
  }
}

const backupType = await readMaybe(new URL('../../src/type/backup.ts', import.meta.url));
const backupUtil = await readMaybe(new URL('../../src/util/backup.ts', import.meta.url));
const resourceTransactionSource = await readMaybe(
  new URL('../../src/util/backupResourceTransaction.ts', import.meta.url),
);
const pluginPresetStore = await readMaybe(new URL('../../src/store/pluginPresets.ts', import.meta.url));
const settingsPanel = await readMaybe(
  new URL('../../src/apps/settings/SettingsDataManagementPage.vue', import.meta.url),
);
const repositoryStore = await readMaybe(new URL('../../src/store/fileRepository.ts', import.meta.url));

test('current full backup embeds plugin presets', () => {
  assert.match(backupType, /PhoneBackupFullDataSchema/);
  assert.match(backupType, /backupKind:\s*z\.literal\('full'\)[\s\S]*schemaVersion:\s*z\.literal\(4\)/);
  assert.match(backupType, /PluginPresetBackupBundleSchema/);
  assert.match(backupType, /appDefaults:\s*z\.record/);
  assert.match(backupType, /records:\s*z\.array/);
  assert.match(backupUtil, /async function buildCompletePhoneBackup/);
  assert.match(backupUtil, /await\s+presetStore\.exportBackupBundle\(\)/);
  assert.match(backupUtil, /schemaVersion:\s*4/);
  assert.match(backupUtil, /embeddedPluginPresets/);
  assert.match(backupUtil, /executeBackupResourceTransaction/);
  assert.match(settingsPanel, /async function downloadBackup\(\)/);
  assert.match(settingsPanel, /await downloadPhoneBackup\(\)/);
});

test('plugin preset replacement and repository boundaries remain transactional', () => {
  assert.match(pluginPresetStore, /executeBackupImportTransaction/);
  assert.match(pluginPresetStore, /captureSnapshot:/);
  assert.match(pluginPresetStore, /restoreSnapshot:/);
  assert.match(pluginPresetStore, /exportBackupBundle/);
  assert.match(pluginPresetStore, /replaceBackupBundle/);
  assert.match(pluginPresetStore, /loadError\.value/);
  assert.match(pluginPresetStore, /const records = await exportBackupRecords\(\)/);
  assert.match(repositoryStore, /repositorySchemaVersion:\s*1/);
  assert.match(repositoryStore, /const backup = buildPhoneBackup\(\)/);
  assert.match(repositoryStore, /await\s+presetStore\.exportBackupRecords\(\)/);
  assert.match(repositoryStore, /getEmbeddedPluginPresets\(backup\)/);
  assert.match(repositoryStore, /embeddedPluginPresets\.records\.length/);
  assert.match(repositoryStore, /Object\.keys\(embeddedPluginPresets\.appDefaults\)\.length/);
  assert.doesNotMatch(repositoryStore, /buildCompletePhoneBackup/);
});

test('resource restore preserves primary and rollback errors', async () => {
  assert.ok(resourceTransactionSource, 'backup resource transaction module is missing');
  const output = transpileModule(resourceTransactionSource, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    fileName: 'backupResourceTransaction.ts',
  }).outputText;
  const { executeBackupResourceTransaction } = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  );
  const calls = [];
  await executeBackupResourceTransaction({
    captureSnapshot: () => ['old'],
    commitSettings: async () => calls.push('settings'),
    replaceResource: async () => calls.push('replace'),
    restoreResource: async () => calls.push('restore'),
  });
  assert.deepEqual(calls, ['replace', 'settings']);

  const primary = new Error('settings failed');
  const rollback = new Error('resource rollback failed');
  await assert.rejects(
    executeBackupResourceTransaction({
      captureSnapshot: () => ['old'],
      commitSettings: async () => {
        throw primary;
      },
      replaceResource: async () => undefined,
      restoreResource: async () => {
        throw rollback;
      },
    }),
    error => error instanceof AggregateError && error.errors.includes(primary) && error.errors.includes(rollback),
  );
});
