/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { computed, ref, shallowRef } from 'vue';
import { createPinia, defineStore, setActivePinia } from 'pinia';

const asModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const compile = source =>
  transpileModule(source, { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText;
const read = name => readFile(new URL(`../../src/apps/recovery/${name}.ts`, import.meta.url), 'utf8');
const comparisonUrl = asModule(compile(await read('settingsComparison')));
const comparison = await import(comparisonUrl);
globalThis.__settingsStoreDeps = { computed, ref, shallowRef, defineStore };
const source = await read('store');
const apiNames = source
  .match(/import \{([^}]+)\} from '@\/apps\/recovery\/api'/u)[1]
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);
const apiUrl = asModule(
  apiNames.map(name => `export const ${name} = (...args) => globalThis.__settingsTestApi.${name}(...args);`).join('\n'),
);
const clientUrl = asModule(
  `export const createSettingsComparisonClient = (...args) => globalThis.__settingsTestClient(...args);`,
);
const storeUrl = asModule(
  `const { computed, ref, shallowRef, defineStore } = globalThis.__settingsStoreDeps;\n` +
    compile(source)
      .replaceAll('@/apps/recovery/api', apiUrl)
      .replaceAll('@/apps/recovery/model', asModule(compile(await read('model'))))
      .replaceAll('@/apps/recovery/settingsComparisonClient', clientUrl)
      .replaceAll('@/apps/recovery/settingsComparison', comparisonUrl),
);
const { useChatRecoveryStore } = await import(storeUrl);

function setup() {
  setActivePinia(createPinia());
  const files = new Map([
    ['new', '{"a":1,"b":2}'],
    ['old', '{ "b": 2, "a": 1 }'],
  ]);
  const dates = { new: 2, old: 1 };
  const deleted = [];
  let active = 0;
  let maxActive = 0;
  globalThis.__settingsTestApi = {
    listNativeSettingsSnapshots: async () =>
      [...files].map(([name, raw]) => ({ name, date: dates[name] || 0, size: raw.length })),
    loadNativeSettingsSnapshot: async (name, signal) => {
      signal?.throwIfAborted();
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
      signal?.throwIfAborted();
      return new TextEncoder().encode(files.get(name)).buffer;
    },
    requestSettingsCleanupToken: async () => ({
      token: 'test-only',
      settingsBackups: [...files.keys()].map(name => ({ name, hash: name })),
    }),
    deleteSettingsSnapshotsByHashes: async (_token, hashes) => {
      for (const name of hashes) {
        deleted.push(name);
        files.delete(name);
      }
    },
    finalizeSettingsCleanupToken: async () => {},
  };
  globalThis.__settingsTestClient = signal => {
    const items = [];
    return {
      add: async (bytes, summary) => {
        signal?.throwIfAborted();
        items.push(await comparison.createSettingsSignature(bytes, summary));
      },
      hash: comparison.hashSettingsBytes,
      finish: async threshold => {
        signal?.throwIfAborted();
        return comparison.createSimilarSettingsGroups(items, threshold);
      },
      dispose: () => {},
    };
  };
  return { store: useChatRecoveryStore(), files, deleted, maxActive: () => maxActive };
}

test('settings cleanup reads sequentially and can retain the older file with a different raw hash', async () => {
  const fixture = setup();
  const scan = await fixture.store.scanDuplicateSettingsSnapshots(100);
  assert.equal(fixture.maxActive(), 1);
  assert.equal(scan.groups[0].keeper.summary.name, 'new');
  const result = await fixture.store.deleteSettingsSnapshots({ [scan.groups[0].id]: 'old' });
  assert.deepEqual(fixture.deleted, ['new']);
  assert.equal(result.deleted.length, 1);
  assert.ok(fixture.files.has('old'));
  assert.equal(fixture.store.settingsDeleting, false);
});

test('changed keeper prevents deletion of its entire group', async () => {
  const fixture = setup();
  const scan = await fixture.store.scanDuplicateSettingsSnapshots();
  fixture.files.set('new', '{"a":99}');
  const result = await fixture.store.deleteSettingsSnapshots({ [scan.groups[0].id]: 'new' });
  assert.equal(result.failed.length, 1);
  assert.deepEqual(fixture.deleted, []);
});

test('changed candidate is excluded and malformed snapshots are reported', async () => {
  const fixture = setup();
  fixture.files.set('broken', '{invalid');
  const scan = await fixture.store.scanDuplicateSettingsSnapshots();
  assert.equal(scan.rejected[0].name, 'broken');
  fixture.files.set('old', '{"a":99}');
  const result = await fixture.store.deleteSettingsSnapshots({ [scan.groups[0].id]: 'new' });
  assert.equal(result.failed.length, 1);
  assert.deepEqual(fixture.deleted, []);
});

test('cancellation clears busy state without publishing partial results or deleting files', async () => {
  const fixture = setup();
  const pending = fixture.store.scanDuplicateSettingsSnapshots();
  fixture.store.cancelSettingsScan();
  await assert.rejects(pending, error => error.name === 'AbortError');
  assert.equal(fixture.store.settingsDuplicateScanning, false);
  assert.equal(fixture.store.settingsDuplicateScanResult, null);
  assert.deepEqual(fixture.deleted, []);
});

test('incomplete keeper selection never calls the deletion API', async () => {
  const fixture = setup();
  await fixture.store.scanDuplicateSettingsSnapshots();
  await assert.rejects(fixture.store.deleteSettingsSnapshots({}), /必须选择/);
  assert.deepEqual(fixture.deleted, []);
});
