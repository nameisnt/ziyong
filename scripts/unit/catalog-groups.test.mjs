/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { ref, computed } from 'vue';

async function compile(file) {
  return transpileModule(await readFile(new URL(`../../src/${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
}
const exports = {};
new Function('exports', await compile('util/catalogGroups.ts'))(exports);
const { buildCatalogGroups } = exports;

test('catalog includes empty saved groups and matches group names as well as item names', () => {
  const items = [
    { id: 'alpha', group: '旅行' },
    { id: 'beta', group: '' },
  ];
  const build = query =>
    buildCatalogGroups(
      ['空组', '旅行'],
      items,
      item => item.group,
      item => item.id,
      query,
    );
  assert.deepEqual(
    build('').map(g => [g.name, g.items.length]),
    [
      ['空组', 0],
      ['旅行', 1],
      ['未分组', 1],
    ],
  );
  assert.deepEqual(
    build('空').map(g => [g.name, g.items.length]),
    [['空组', 0]],
  );
  assert.deepEqual(build('旅行')[0].items, [items[0]]);
  assert.deepEqual(build('BETA')[0].items, [items[1]]);
  assert.deepEqual(build('absent'), []);
  assert.deepEqual(items, [
    { id: 'alpha', group: '旅行' },
    { id: 'beta', group: '' },
  ]);
});

async function storeFixture(file, name, persisted = {}) {
  let writes = 0;
  const exports = {};
  const modules = {
    '@sillytavern/script': {
      saveSettingsDebounced: () => {
        writes++;
      },
    },
    '@sillytavern/scripts/extensions': { extension_settings: persisted },
  };
  new Function('require', 'exports', 'defineStore', 'ref', 'computed', '_', await compile(file))(
    id => modules[id],
    exports,
    (_id, setup) => setup,
    ref,
    computed,
    {
      get: (o, k, v) => o[k] ?? v,
      set: (o, k, v) => {
        o[k] = v;
      },
    },
  );
  return { store: exports[name](), persisted, writes: () => writes };
}

test('preset bulk assignment persists once, separates sources and restores after reload', async () => {
  const f = await storeFixture('store/presetCatalogGroups.ts', 'usePresetCatalogGroupStore');
  f.store.assignMany('tavern', ['current', 'other'], '新组');
  assert.equal(f.writes(), 1);
  assert.equal(f.store.groupOf('tavern', 'current'), '新组');
  assert.equal(f.store.groupOf('plugin', 'current'), '');
  f.store.assignMany('tavern', ['current'], '');
  assert.equal(f.store.groupOf('tavern', 'other'), '新组');
  f.store.createGroup('空组');
  const reloaded = await storeFixture(
    'store/presetCatalogGroups.ts',
    'usePresetCatalogGroupStore',
    JSON.parse(JSON.stringify(f.persisted)),
  );
  assert.deepEqual(reloaded.store.groups.value, ['新组', '空组']);
  assert.equal(reloaded.store.groupOf('tavern', 'other'), '新组');
});

test('worldbook bulk grouping preserves entry group settings and persists once', async () => {
  const f = await storeFixture('store/worldbookCatalogGroups.ts', 'useWorldbookCatalogGroupStore');
  f.store.assignEntry('A', 7, '条目组');
  f.store.setEntryGroupMode('A', '条目组', 'single');
  const before = f.writes();
  f.store.assignBooks(['A', 'B'], '书组');
  assert.equal(f.writes(), before + 1);
  assert.equal(f.store.bookGroupOf('B'), '书组');
  assert.equal(f.store.entryGroupOf('A', 7), '条目组');
  assert.equal(f.store.entryGroupMode('A', '条目组'), 'single');
  f.store.assignBooks(['A', 'B'], '');
  assert.deepEqual(f.store.bookGroups.value, ['书组']);
  assert.equal(f.store.bookGroupOf('A'), '');
});
