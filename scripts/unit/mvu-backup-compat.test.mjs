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

const component = await readMaybe(new URL('../../src/apps/mvu-modifier/MvuModifierApp.vue', import.meta.url));
const appModule = await readMaybe(new URL('../../src/apps/mvu-modifier/index.ts', import.meta.url));
const store = await readMaybe(new URL('../../src/store/mvuModifier.ts', import.meta.url));
const migrationSource = await readMaybe(new URL('../../src/util/mvuPersistence.ts', import.meta.url));

test('MVU persistent state is registered as a global configuration backup domain', () => {
  assert.match(appModule, /backupDomains:\s*\[/);
  assert.match(appModule, /key:\s*['"]mvu-modifier['"]/);
  assert.match(appModule, /category:\s*['"]configuration['"]/);
  assert.match(appModule, /scope:\s*['"]global['"]/);
  assert.match(store, /MvuModifierSettingsSchema/);
  assert.match(store, /legacyLocalStorageImported/);
});

test('the MVU page no longer owns or writes browser localStorage', () => {
  assert.match(component, /useMvuModifierPersistenceStore\(/);
  assert.doesNotMatch(component, /localStorage\.(?:getItem|setItem|removeItem)/);
  assert.doesNotMatch(component, /function\s+(?:readStorage|saveStorage)/);
  assert.doesNotMatch(store, /localStorage\.removeItem/);
});

test('legacy MVU storage is copied once without deleting the old keys', async () => {
  assert.ok(migrationSource, 'MVU compatibility migration module is missing');
  const output = transpileModule(migrationSource, {
    compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
    fileName: 'mvuPersistence.ts',
  }).outputText;
  const { migrateLegacyMvuStorage, shouldImportLegacyMvuStorage } = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  );
  const values = new Map([
    ['sillytavern_phone_mvu_favorites', JSON.stringify({ character_a: [{ label: 'hp', path: ['hp'] }] })],
    [
      'sillytavern_phone_mvu_history',
      JSON.stringify({ chat_a: [{ id: 'change_1', newValue: 2, oldValue: 1, path: 'hp', timestamp: 1 }] }),
    ],
  ]);
  const reads = [];
  const migrated = migrateLegacyMvuStorage(key => {
    reads.push(key);
    return values.get(key) ?? null;
  });

  assert.equal(shouldImportLegacyMvuStorage(undefined), true);
  assert.equal(shouldImportLegacyMvuStorage({ version: 1, favorites: {}, history: {} }), false);
  assert.equal(migrated.legacyLocalStorageImported, true);
  assert.equal(migrated.version, 1);
  assert.deepEqual(migrated.favorites.character_a[0].path, ['hp']);
  assert.equal(migrated.history.chat_a[0].newValue, 2);
  assert.deepEqual(reads.sort(), ['sillytavern_phone_mvu_favorites', 'sillytavern_phone_mvu_history']);
});
