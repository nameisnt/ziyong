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

function fixture(equivalent = (a, b) => a === b) {
  let scope = 'A',
    selected = 'P',
    live = makePreset(),
    fail = false,
    ignore = false,
    beforeWrite,
    reloadChat;
  const presets = { P: makePreset(), Q: makePreset() },
    writes = [],
    warnings = [],
    loads = [];
  const settings = {};
  const api = {
    buildPresetDisplayNodes,
    getCurrentTavernPresetName: () => selected,
    readTavernPreset: name => clone(name === 'in_use' ? live : presets[name]),
    loadTavernPreset: async name => {
      loads.push(name);
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
          getEnabledPresetRegexCount: () => (reloadChat ? 1 : 0),
          reloadCurrentChatForPresetRegex: async () => reloadChat?.(),
        },
        '@/store/chatScoped': {
          getCurrentChatScopeKey: () => scope,
          areChatScopeKeysEquivalent: equivalent,
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
    loads,
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
    reloadChat: value => {
      reloadChat = value;
    },
    mutate: callback => callback(live),
  };
}
const statesA = { first: true, third: false, body: false };
const statesB = { first: false, third: true, body: true };
const bind = (store, scope, states, presetName = 'P') =>
  store.saveBinding(scope, { presetName, reloadRegex: false, promptStates: states });
const current = f => clone(f.helper.snapshotPromptStates(f.live()));

test('same-chat page visits and reload notifications preserve manual switches and preset choice', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  await f.store.switchScope('A');
  f.mutate(live => {
    live.prompts[2].enabled = true;
  });
  const count = f.writes.length;
  for (let i = 0; i < 4; i++) await f.store.switchScope('A');
  assert.equal(f.writes.length, count);
  assert.equal(f.live().prompts[2].enabled, true);
  await f.api.loadTavernPreset('Q');
  await f.store.switchScope('A');
  assert.equal(f.api.getCurrentTavernPresetName(), 'Q');
  assert.deepEqual(f.loads, ['Q']);
  await f.store.applySelection('A', f.store.getBinding('A'), false);
  assert.equal(f.api.getCurrentTavernPresetName(), 'P');
  assert.deepEqual(current(f), statesA);
});

test('saving on an unbound visit does not apply until explicit Apply or a new chat visit', async () => {
  const f = fixture();
  await f.store.switchScope('A');
  const original = current(f);
  bind(f.store, 'A', statesA);
  await f.store.switchScope('A');
  assert.deepEqual(current(f), original);
  assert.equal(f.writes.length, 0);
  await f.store.applySelection('A', f.store.getBinding('A'), false);
  bind(f.store, 'A', statesB);
  await f.store.switchScope('A');
  assert.deepEqual(current(f), statesA);
  f.scope('B');
  await f.store.switchScope('B');
  f.scope('A');
  await f.store.switchScope('A');
  assert.deepEqual(current(f), statesB);
});

test('removal and rebinding in the same chat do not cause an automatic application', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  await f.store.switchScope('A');
  await f.store.removeBinding('A');
  const restored = current(f),
    count = f.writes.length;
  bind(f.store, 'A', statesB);
  await f.store.switchScope('A');
  assert.deepEqual(current(f), restored);
  assert.equal(f.writes.length, count);
});

test('failed automatic attempts report once, preserve recovery and retry only explicitly or on reentry', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  f.fail(true);
  await f.store.switchScope('A');
  assert.equal(f.warnings.length, 1);
  assert.ok(f.store.settings.value.activePromptOverride);
  f.fail(false);
  await f.store.switchScope('A');
  assert.equal(f.writes.length, 0);
  assert.equal(f.warnings.length, 1);
  await f.store.applySelection('A', f.store.getBinding('A'), false);
  assert.deepEqual(current(f), statesA);
});

test('fresh store initializes once; data rehydration alone does not reapply', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  await f.store.switchScope('A');
  f.mutate(live => {
    live.prompts[2].enabled = true;
  });
  const raw = clone(f.store.settings.value);
  f.store.importBackup(raw);
  await f.store.switchScope('A');
  assert.equal(f.live().prompts[2].enabled, true);
  const restarted = f.create(raw);
  await restarted.switchScope('A');
  assert.deepEqual(current(f), statesA);
  f.mutate(live => {
    live.prompts[2].enabled = true;
  });
  restarted.rehydrateFromSettings();
  await restarted.switchScope('A');
  assert.equal(f.live().prompts[2].enabled, true);
});

test('duplicate in-flight notifications join the worker without cancelling or reapplying', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  let resume;
  f.beforeWrite(
    () =>
      new Promise(resolve => {
        resume = resolve;
      }),
  );
  const pending = f.store.switchScope('A');
  while (!resume) await new Promise(resolve => setImmediate(resolve));
  const repeated = f.store.switchScope('A');
  f.beforeWrite(undefined);
  resume();
  await Promise.all([pending, repeated]);
  assert.deepEqual(current(f), statesA);
  assert.equal(f.writes.length, 1);
});

test('explicit Apply supersedes a queued automatic request, including a regex reload notification', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  const pending = f.store.switchScope('A');
  let reloads = 0;
  f.reloadChat(() => {
    reloads++;
    void f.store.switchScope('A');
  });
  await f.store.applySelection('A', { presetName: 'P', reloadRegex: true, promptStates: statesB });
  await pending;
  assert.deepEqual(current(f), statesB);
  assert.equal(reloads, 1);
  assert.equal(f.writes.length, 1);
});

test('rapid A/B/A visits and historical browsing only apply to the actual latest chat', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  bind(f.store, 'B', statesB);
  const a = f.store.switchScope('A');
  f.scope('B');
  const b = f.store.switchScope('B');
  f.scope('A');
  const final = f.store.switchScope('A');
  await Promise.all([a, b, final]);
  assert.deepEqual(current(f), statesA);
  const count = f.writes.length;
  await f.store.switchScope('B');
  assert.equal((await f.store.applySelection('B', f.store.getBinding('B'), false)).applied, false);
  assert.equal(f.writes.length, count);
});

test('placeholder readiness and equivalent owner aliases do not create extra chat visits', async () => {
  const f = fixture((a, b) => a.replace('alias-A', 'A') === b.replace('alias-A', 'A'));
  bind(f.store, 'A', statesA);
  f.scope('');
  await f.store.switchScope('');
  assert.equal(f.warnings.length, 0);
  f.scope('A');
  await f.store.switchScope('A');
  f.mutate(live => {
    live.prompts[2].enabled = true;
  });
  f.scope('alias-A');
  await f.store.switchScope('alias-A');
  assert.equal(f.live().prompts[2].enabled, true);
});

function renameBinding(f, oldName, newName) {
  const raw = clone(f.store.settings.value);
  if (raw.bindings[oldName]) {
    raw.bindings[newName] = raw.bindings[oldName];
    delete raw.bindings[oldName];
  }
  f.store.renameScope([oldName], newName);
  f.store.importBackup(raw);
}

test('native and plugin rename preserve manual switches before and after host identity changes', async () => {
  for (const hostAlreadyChanged of [false, true]) {
    const f = fixture();
    bind(f.store, 'A', statesA);
    await f.store.switchScope('A');
    f.mutate(live => {
      live.prompts[2].enabled = true;
    });
    const count = f.writes.length;
    if (hostAlreadyChanged) f.scope('Renamed');
    renameBinding(f, 'A', 'Renamed');
    await f.store.switchScope(hostAlreadyChanged ? 'Renamed' : 'A');
    f.scope('Renamed');
    await f.store.switchScope('Renamed');
    assert.equal(f.writes.length, count);
    assert.equal(f.live().prompts[2].enabled, true);
    assert.deepEqual(clone(f.store.getBinding('Renamed').promptStates), statesA);
    await f.store.applySelection('Renamed', f.store.getBinding('Renamed'), false);
    assert.deepEqual(current(f), statesA);
    f.scope('B');
    await f.store.switchScope('B');
    f.scope('Renamed');
    await f.store.switchScope('Renamed');
    assert.deepEqual(current(f), statesA);
  }
});

test('rename before pending apply uses the new binding key without another automatic request', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  const pending = f.store.switchScope('A');
  renameBinding(f, 'A', 'Renamed');
  f.scope('Renamed');
  await f.store.switchScope('Renamed');
  await pending;
  assert.deepEqual(current(f), statesA);
  assert.equal(f.writes.length, 1);
});

test('rename during a host write preserves the active request and ignores unrelated historical renames', async () => {
  const f = fixture();
  bind(f.store, 'A', statesA);
  let resume;
  f.beforeWrite(
    () =>
      new Promise(resolve => {
        resume = resolve;
      }),
  );
  const pending = f.store.switchScope('A');
  while (!resume) await new Promise(resolve => setImmediate(resolve));
  renameBinding(f, 'A', 'Renamed');
  f.scope('Renamed');
  const repeated = f.store.switchScope('Renamed');
  f.beforeWrite(undefined);
  resume();
  await Promise.all([pending, repeated]);
  assert.deepEqual(current(f), statesA);
  assert.equal(f.writes.length, 1);
  f.mutate(live => {
    live.prompts[2].enabled = true;
  });
  f.store.renameScope(['B'], 'Historical');
  await f.store.switchScope('Renamed');
  assert.equal(f.live().prompts[2].enabled, true);
});

test('lifecycle initialization and both rename routes use the shared preset visit boundary', async () => {
  const lifecycle = await read('core/phoneLifecycle.ts');
  assert.match(lifecycle, /usePresetLinkStore\(pinia\)\.switchScope\(phone\.currentTavernScopeKey\)/u);
  const index = await read('apps/preset-link/index.ts');
  assert.match(
    index,
    /scopeRenameHandler: \(sources, target\) => usePresetLinkStore\(\)\.renameScope\(sources, target\)/u,
  );
  assert.match(await read('App.vue'), /migratePhoneChatRename\(payload\)/u);
  assert.match(await read('util/tavernChatRename.ts'), /migratePhoneChatRename\(event\)/u);
});

test('rename of an unbound visit still suppresses reapply; a reused old filename is a new visit', async () => {
  const f = fixture();
  await f.store.switchScope('A');
  renameBinding(f, 'A', 'Renamed');
  f.scope('Renamed');
  await f.store.switchScope('Renamed');
  bind(f.store, 'Renamed', statesA);
  await f.store.switchScope('Renamed');
  assert.equal(f.writes.length, 0);
  bind(f.store, 'A', statesB);
  f.scope('A');
  await f.store.switchScope('A');
  assert.deepEqual(current(f), statesB);
});

function singleGroup(f) {
  const metadata = {
    baibaiToolkit: {
      presetPromptGroups: {
        version: 2,
        groups: [
          {
            id: 'view',
            name: 'View',
            startPromptId: 'first',
            endPromptId: 'body',
            selectionMode: 'single',
          },
        ],
      },
    },
  };
  f.presets.P.extensions = clone(metadata);
  f.presets.P.prompts[2].enabled = false;
  f.mutate(live => {
    live.extensions = clone(metadata);
    live.prompts[2].enabled = false;
  });
}

test('restoration includes every single-group peer after a native manual selection', async () => {
  const f = fixture();
  singleGroup(f);
  bind(f.store, 'A', { first: false, third: true, body: false });
  await f.store.applyScope('A');
  f.store.retainNativeGroupRestore(current(f));
  f.mutate(live =>
    live.prompts.forEach(prompt => {
      prompt.enabled = prompt.id === 'body';
    }),
  );
  assert.deepEqual(clone(f.store.getBinding('A').promptStates), { first: false, third: true, body: false });
  await f.store.removeBinding('A');
  assert.deepEqual(current(f), { first: true, third: false, body: false });
});

test('a binding initially equal to the source captures its first manually touched group', async () => {
  const f = fixture();
  singleGroup(f);
  bind(f.store, 'A', { first: true, third: false, body: false });
  await f.store.applyScope('A');
  assert.equal(f.store.settings.value.activePromptOverride, undefined);
  f.store.retainNativeGroupRestore(current(f));
  f.mutate(live =>
    live.prompts.forEach(prompt => {
      prompt.enabled = prompt.id === 'body';
    }),
  );
  f.scope('C');
  await f.store.switchScope('C');
  assert.deepEqual(current(f), { first: true, third: false, body: false });
});

test('native edits cannot interleave with an in-flight binding write', async () => {
  const f = fixture();
  singleGroup(f);
  bind(f.store, 'A', { first: false, third: true, body: false });
  let resume;
  f.beforeWrite(
    () =>
      new Promise(resolve => {
        resume = resolve;
      }),
  );
  const pending = f.store.applyScope('A');
  try {
    while (!resume) await new Promise(resolve => setImmediate(resolve));
    assert.throws(() => f.store.retainNativeGroupRestore(current(f)), /正在应用预设绑定/);
  } finally {
    resume();
    await pending;
  }
  assert.doesNotThrow(() => f.store.retainNativeGroupRestore(current(f)));
});

test('restoration validation checks affected groups without blocking on unrelated switches', () => {
  const f = fixture();
  const preset = makePreset();
  preset.extensions = {
    baibaiToolkit: {
      presetPromptGroups: {
        version: 2,
        groups: [
          {
            id: 'g',
            name: 'Other group',
            startPromptId: 'first',
            endPromptId: 'third',
            selectionMode: 'single',
          },
        ],
      },
    },
  };
  preset.prompts[1].enabled = true;
  assert.doesNotThrow(() => f.helper.checkPromptStates(preset, { body: false }, true));
  assert.throws(() => f.helper.checkPromptStates(preset, { first: true }, true), /只能启用一个/);
});

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
