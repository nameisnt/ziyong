/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSourceFile, ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { z } from 'zod';
import lodash from 'lodash';

const read = p => readFile(new URL(`../../src/${p}`, import.meta.url), 'utf8');
const storeSource = await read('apps/preset-link/store.ts');
const helperSource = await read('apps/preset-link/promptSwitches.ts');
const groupsSource = await read('apps/preset-manager/promptGroups.ts');
const apiSource = await read('apps/preset-manager/api.ts');
const ast = createSourceFile('api.ts', apiSource, ScriptTarget.Latest, true);
const nodesSource = ast.statements.find(n => n.name?.getText(ast) === 'buildPresetDisplayNodes').getText(ast);
function moduleOf(source, imports = {}, globals = {}) {
  const exports = {};
  runInNewContext(
    transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } })
      .outputText,
    {
      exports,
      require: name => {
        if (!(name in imports)) throw Error(`Unexpected import ${name}`);
        return imports[name];
      },
      Error,
      structuredClone,
      ...globals,
    },
  );
  return exports;
}
const groups = moduleOf(groupsSource);
const { buildPresetDisplayNodes } = moduleOf(nodesSource, {}, groups);
const clone = value => JSON.parse(JSON.stringify(value));
const makePreset = () => ({
  extensions: {},
  settings: { temperature: 0.7 },
  prompts: ['first', 'third', 'body'].map((id, i) => ({
    id,
    name: id,
    enabled: i !== 1,
    content: `body ${id}`,
    role: 'system',
  })),
});

function fixture() {
  let scope = 'A',
    selected = 'P',
    live = makePreset(),
    fail = false,
    ignore = false,
    beforeWrite;
  const presets = { P: makePreset(), Q: makePreset() },
    writes = [],
    warnings = [];
  const settings = {};
  const api = {
    buildPresetDisplayNodes,
    getCurrentTavernPresetName: () => selected,
    readTavernPreset: name => clone(name === 'in_use' ? live : presets[name]),
    loadTavernPreset: async name => {
      selected = name;
      live = clone(presets[name]);
    },
  };
  const helper = moduleOf(helperSource, {
    '@/apps/preset-manager/api': api,
    '@/util/runtime': {
      getOptionalGlobalFunction: () => async (name, update) => {
        assert.equal(name, 'in_use');
        await beforeWrite?.();
        if (fail) throw Error('write failed');
        writes.push(name);
        if (!ignore) live = update(clone(live));
        return clone(live);
      },
    },
  });
  const create = raw => {
    settings.sillytavern_phone_preset_links = raw || {};
    return moduleOf(
      storeSource,
      {
        '@/apps/preset-manager/api': api,
        './promptSwitches': helper,
        './api': {
          createPresetRegexNoticeGuard: () => null,
          getEnabledPresetRegexCount: () => 0,
          reloadCurrentChatForPresetRegex: async () => {},
        },
        '@/store/chatScoped': {
          getCurrentChatScopeKey: () => scope,
          areChatScopeKeysEquivalent: (a, b) => a === b,
          isPlaceholderChatScopeKey: key => !key,
        },
        '@/util/zod': { validateInplace: (schema, value) => schema.parse(value) },
        '@sillytavern/script': { saveSettingsDebounced: () => {} },
        '@sillytavern/scripts/extensions': { extension_settings: settings },
      },
      {
        z,
        _: lodash,
        klona: clone,
        ref: value => ({ value }),
        watch: () => {},
        defineStore: (_id, setup) => setup,
        toastr: { warning: value => warnings.push(value) },
        window: { setTimeout: callback => setTimeout(callback, 0) },
      },
    ).usePresetLinkStore();
  };
  return {
    store: create(),
    create,
    api,
    helper,
    presets,
    writes,
    warnings,
    live: () => live,
    scope: value => {
      scope = value;
    },
    fail: value => {
      fail = value;
    },
    ignore: value => {
      ignore = value;
    },
    beforeWrite: value => {
      beforeWrite = value;
    },
    mutate: callback => callback(live),
  };
}
const statesA = { first: true, third: false, body: false };
const statesB = { first: false, third: true, body: true };
const bind = (store, scope, states, presetName = 'P') =>
  store.saveBinding(scope, { presetName, reloadRegex: false, promptStates: states });
const current = f => clone(f.helper.snapshotPromptStates(f.live()));

test('same preset restores each chat combination repeatedly without changing source content or order', async () => {
  const f = fixture(),
    original = clone(f.presets);
  bind(f.store, 'A', statesA);
  bind(f.store, 'B', statesB);
  for (let i = 0; i < 3; i++)
    for (const [scope, states] of [
      ['A', statesA],
      ['B', statesB],
    ]) {
      f.scope(scope);
      await f.store.switchScope(scope);
      assert.deepEqual(current(f), states);
    }
  assert.deepEqual(f.presets, original);
  assert.deepEqual(
    f.live().prompts.map(p => [p.id, p.content]),
    original.P.prompts.map(p => [p.id, p.content]),
  );
  f.scope('C');
  await f.store.switchScope('C');
  assert.deepEqual(current(f), clone(f.helper.snapshotPromptStates(original.P)));
  assert.equal(f.store.settings.value.activePromptOverride, undefined);
});

test('removing current binding restores switches; historical removal does not change live switches', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  bind(f.store, 'B', statesB);
  await f.store.applyScope('A');
  await f.store.removeBinding('B');
  assert.deepEqual(current(f), statesA);
  await f.store.removeBinding('A');
  assert.equal(f.live().prompts[2].enabled, true);
  assert.equal(f.store.getBinding('A'), null);
});

test('saved restoration record survives store reload; legacy binding restores previous override', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  bind(f.store, 'B', undefined);
  await f.store.applyScope('A');
  const reloaded = f.create(clone(f.store.settings.value));
  f.scope('B');
  await reloaded.applyScope('B');
  assert.deepEqual(current(f), clone(f.helper.snapshotPromptStates(f.presets.P)));
  assert.equal(reloaded.getBinding('A').promptStates.body, false);
});

test('different preset transitions discard old live overrides without writing named presets', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  bind(f.store, 'B', statesB, 'Q');
  await f.store.applyScope('A');
  f.scope('B');
  await f.store.applyScope('B');
  assert.equal(f.api.getCurrentTavernPresetName(), 'Q');
  assert.deepEqual(current(f), statesB);
  f.scope('C');
  await f.store.applyScope('C');
  assert.deepEqual(current(f), clone(f.helper.snapshotPromptStates(f.presets.Q)));
});

test('failed or ignored host write reports failure, retains recovery and can retry', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  f.fail(true);
  await assert.rejects(f.store.applyScope('A'), /write failed/);
  assert.ok(f.store.settings.value.activePromptOverride);
  f.fail(false);
  f.ignore(true);
  await assert.rejects(f.store.applyScope('A'), /未应用完整/);
  f.ignore(false);
  await f.store.applyScope('A');
  assert.deepEqual(current(f), statesA);
});

test('obsolete requests do not write switch state into the newly opened chat', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  f.beforeWrite(() => {
    f.scope('B');
  });
  assert.equal((await f.store.applyScope('A')).applied, false);
  assert.deepEqual(current(f), clone(f.helper.snapshotPromptStates(f.presets.P)));
  f.beforeWrite(undefined);
  await f.store.applyScope('B');
  assert.equal(f.store.settings.value.activePromptOverride, undefined);
});

test('new entries use source state and missing IDs are reported without matching entry names', async () => {
  const f = fixture();
  bind(f.store, 'A', { ...statesA, removed: true });
  const newPrompt = { id: 'new', name: 'first', enabled: true, role: 'user' };
  f.presets.P.prompts.push(clone(newPrompt));
  f.mutate(p => p.prompts.push({ ...newPrompt, enabled: false }));
  const result = await f.store.applyScope('A');
  assert.deepEqual(clone(result.missingPromptIds), ['removed']);
  assert.equal(f.live().prompts.at(-1).enabled, true);
  assert.equal(f.warnings.length, 1);
});

test('single-select validation reuses actual preset groups; enabling a member disables its sibling', () => {
  const f = fixture(),
    p = f.presets.P;
  groups
    .writePresetPromptGroups(
      p,
      p.prompts.map(p => p.id),
    )
    .groups.push({
      id: 'view',
      name: '视角',
      enabled: true,
      collapsed: false,
      selectionMode: 'single',
      startPromptId: 'first',
      endPromptId: 'third',
    });
  assert.throws(() => bind(f.store, 'A', { first: true, third: true }), /只能启用一个/);
  groups.applyPresetPromptSelection(p, p.prompts, 'third', true);
  assert.equal(p.prompts[0].enabled, false);
  assert.equal(p.prompts[1].enabled, true);
});

test('backup schema, inheritance and preset rename preserve independent switch maps', () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  f.store.inheritBinding('A', 'B');
  f.store.getBinding('B').promptStates.body = true;
  assert.equal(f.store.getBinding('A').promptStates.body, false);
  f.store.migratePresetReferences('P', 'Renamed');
  const copy = f.create(clone(f.store.settings.value));
  assert.equal(copy.getBinding('A').presetName, 'Renamed');
  assert.deepEqual(clone(copy.getBinding('A').promptStates), statesA);
});
