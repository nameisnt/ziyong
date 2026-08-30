// eslint-disable-next-line import-x/no-nodejs-modules
import assert from 'node:assert/strict';
// eslint-disable-next-line import-x/no-nodejs-modules
import { readFile } from 'node:fs/promises';

const registry = await readFile(new URL('../src/core/appRegistry.ts', import.meta.url), 'utf8');
const types = await readFile(new URL('../src/type/backup.ts', import.meta.url), 'utf8');
const backup = await readFile(new URL('../src/util/backup.ts', import.meta.url), 'utf8');
const backupTransaction = await readFile(new URL('../src/util/backupTransaction.ts', import.meta.url), 'utf8');
const backupPolicy = await readFile(new URL('../src/util/backupPolicy.ts', import.meta.url), 'utf8');
const settingsPanel = await readFile(
  new URL('../src/apps/settings/SettingsDataManagementPage.vue', import.meta.url),
  'utf8',
);
const generationService = await readFile(new URL('../src/core/generationService.ts', import.meta.url), 'utf8');
const fileRepository = await readFile(new URL('../src/store/fileRepository.ts', import.meta.url), 'utf8');

assert.match(registry, /category: 'configuration' \| 'content' \| 'draft'/);
assert.match(registry, /scope: 'global' \| 'chat'/);
assert.match(registry, /Duplicate phone backup domain key/);
assert.match(types, /backupKind: z\.literal\('full'\)/);
assert.match(types, /backupKind: z\.literal\('current-chat'\)/);
assert.match(
  types,
  /domainVersions: z\.record\(z\.string\(\), z\.number\(\)\.int\(\)\.positive\(\)\)/,
);
assert.doesNotMatch(types, /PhoneBackupLegacyDataSchema|getPhoneBackupKind/);
assert.match(backup, /backupKind: 'full'/);
assert.match(backup, /backupKind: 'current-chat'/);
assert.match(backup, /selectCurrentChatBackupDomains\(registeredDomains\)/);
assert.match(backup, /assertFullBackupImportAllowed\(backup\.backupKind\)/);
assert.match(backup, /sourceVersion !== entry\.domain\.schemaVersion/);
assert.match(backup, /selectGeneratedContentDomains\(getRegisteredPhoneBackupDomains\(\)\)/);
assert.match(backupPolicy, /当前聊天备份不能执行完整恢复/);
assert.match(backupPolicy, /domain\.scope === 'chat' && \(domain\.category === 'content' \|\| domain\.category === 'draft'\)/);
assert.match(backup, /function restoreExtensionSettings/);
assert.match(backup, /async function commitBackupImport/);
assert.match(backup, /executeBackupImportTransaction/);
assert.match(backup, /restoreSnapshot: restoreExtensionSettings/);
assert.match(backupTransaction, /options\.rehydrate\(\)/);
assert.match(backupTransaction, /options\.restoreSnapshot\(snapshot\)/);
assert.match(backup, /entry\.domain\.schema\.safeParse\(entry\.data\)/);
assert.match(backup, /export function planPhoneFullBackupImport/);
assert.match(backup, /export function planPhoneBackupScopeImport/);
assert.match(backup, /missingDomainLabels/);
assert.match(backup, /unknownDomainKeys/);
assert.match(settingsPanel, /formatBackupImportPlan/);
assert.match(settingsPanel, /planPhoneFullBackupImport\(backup/);
assert.match(settingsPanel, /planPhoneBackupScopeImport\(backup, option\.scopeKey\)/);
assert.match(generationService, /async function executeGenerationLifecycle/);
assert.match(generationService, /export async function generateOrderedPromptContent[\s\S]*?executeGenerationLifecycle/);
assert.match(generationService, /export async function generateContent[\s\S]*?executeGenerationLifecycle/);
assert.match(
  generationService,
  /prepared\.pluginPresetRecord[\s\S]*?textProvider\.mode === 'external'[\s\S]*?generateFromCapturedOrderedPrompts/,
);
assert.doesNotMatch(fileRepository, /structuredClone\(settings\.value\)/);
assert.match(fileRepository, /cloneJsonValue\(settings\.value\)/);

console.log('Backup contract safeguards are present.');
