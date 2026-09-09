/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { ModuleKind, ScriptTarget, transpileModule, createSourceFile } from 'typescript';

const read = name => readFile(new URL(`../../src/apps/preset-manager/${name}`, import.meta.url), 'utf8');
function moduleOf(source, imports = {}, globals = {}) {
  const exports = {};
  runInNewContext(
    transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 } })
      .outputText,
    {
      exports,
      require: name => {
        if (!(name in imports)) throw Error(name);
        return imports[name];
      },
      Error,
      ...globals,
    },
  );
  return exports;
}
const groups = moduleOf(await read('promptGroups.ts'));
const awaitNativeSource = await read('nativeToggle.ts');
const nativeStoreSource = await read('nativeGroups.ts');
const apiSource = await read('api.ts');
const ast = createSourceFile('api.ts', apiSource, ScriptTarget.Latest, true);
const { buildPresetDisplayNodes } = moduleOf(
  ast.statements.find(node => node.name?.getText(ast) === 'buildPresetDisplayNodes').getText(ast),
  {},
  groups,
);
const config = moduleOf(await read('nativeConfiguration.ts'), {
  './api': { buildPresetDisplayNodes },
  './promptGroups': groups,
});
const root = () => ({
  extensions: {
    baibaiToolkit: {
      presetPromptGroups: {
        version: 2,
        groups: [{ id: 'g', name: 'Group', startPromptId: 'a', endPromptId: 'c', selectionMode: 'single' }],
      },
    },
  },
  prompts: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, enabled: i === 0 || i === 3 })),
});
const clone = value => JSON.parse(JSON.stringify(value));

test('native lifecycle installs once, exposes module failure for retry, and cleans up', async () => {
  let fail = true,
    installs = 0,
    stops = 0,
    dispose;
  const host = {};
  Object.defineProperty(host, 'promptManager', { enumerable: true, get: () => null });
  const imports = {
    '@/apps/preset-link/store': { usePresetLinkStore: () => ({ retainNativeGroupRestore() {} }) },
    './nativeToggle': {
      installNativePromptToggle: () => {
        installs++;
        return () => {
          stops++;
        };
      },
    },
  };
  Object.defineProperty(imports, '@sillytavern/scripts/openai', {
    get: () => {
      if (fail) throw Error('offline');
      return host;
    },
  });
  const { useNativePresetGroups } = moduleOf(nativeStoreSource, imports, {
    defineStore: (_id, setup) => setup,
    ref: value => ({ value }),
    onScopeDispose: fn => {
      dispose = fn;
    },
    document: {},
  });
  const store = useNativePresetGroups();
  await assert.rejects(store.ensureReady(), /offline/);
  assert.match(store.error.value, /offline/);
  fail = false;
  await Promise.all([store.ensureReady(), store.ensureReady()]);
  assert.equal(installs, 1);
  assert.equal(store.error.value, '');
  dispose();
  assert.equal(stops, 1);
});

test('native flag defaults off, survives group edits and JSON roundtrip, and can be disabled', () => {
  const preset = root();
  assert.equal(groups.isNativePromptGroupingEnabled(preset), false);
  config.configureNativeGrouping(preset, true, {});
  groups.writePresetPromptGroups(preset, ['a', 'b', 'c', 'd']);
  assert.equal(groups.isNativePromptGroupingEnabled(clone(preset)), true);
  config.configureNativeGrouping(preset, false, {});
  assert.equal(groups.isNativePromptGroupingEnabled(preset), false);
  assert.deepEqual(
    preset.prompts.map(p => p.enabled),
    [true, false, false, true],
  );
});

test('enabling refuses conflicting switches until an explicit retention choice, including all off', () => {
  const preset = root();
  preset.prompts[1].enabled = true;
  assert.equal(config.nativeGroupingConflicts(preset).length, 1);
  assert.throws(() => config.configureNativeGrouping(preset, true, {}), /多个启用/);
  assert.equal(groups.isNativePromptGroupingEnabled(preset), false);
  assert.throws(() => config.configureNativeGrouping(preset, true, { g: 'missing' }), /不在/);
  config.configureNativeGrouping(preset, true, { g: '' });
  assert.deepEqual(
    preset.prompts.map(p => p.enabled),
    [false, false, false, true],
  );
});

test('native capture prepares peers but leaves exactly one original toggle/render/save', () => {
  const preset = root();
  config.configureNativeGrouping(preset, true, {});
  const order = preset.prompts.map(p => ({ identifier: p.id, enabled: p.enabled }));
  let capture,
    saves = 0,
    renders = 0,
    restored,
    error,
    stopped = false;
  class Element {
    constructor(id) {
      this.dataset = { pmIdentifier: id };
    }
    closest() {
      return this;
    }
  }
  const counts = {};
  const manager = {
    activeCharacter: {},
    containerElement: { contains: () => true },
    configuration: { prefix: 'completion_' },
    serviceSettings: preset,
    getPromptOrderForCharacter: () => order,
    tokenHandler: { getCounts: () => counts },
  };
  const { installNativePromptToggle } = moduleOf(awaitNativeSource, { './promptGroups': groups }, { Element });
  const stop = installNativePromptToggle({
    document: {
      addEventListener: (name, fn, capturePhase) => {
        assert.equal(name, 'click');
        assert.equal(capturePhase, true);
        capture = fn;
      },
      removeEventListener: (_name, fn) => {
        assert.equal(fn, capture);
        capture = undefined;
      },
    },
    getManager: () => manager,
    beforeChange: states => {
      restored = clone(states);
    },
    onError: e => {
      error = e;
    },
  });
  const click = id => {
    stopped = false;
    capture?.({
      target: new Element(id),
      preventDefault() {},
      stopImmediatePropagation() {
        stopped = true;
      },
    });
    if (!stopped) {
      const target = order.find(item => item.identifier === id);
      target.enabled = !target.enabled;
      renders++;
      saves++;
    }
  };
  click('b');
  assert.deepEqual(
    order.map(p => p.enabled),
    [false, true, false, true],
  );
  assert.deepEqual(restored, { a: true, b: false, c: false });
  assert.equal(counts.a, null);
  assert.equal(saves, 1);
  assert.equal(renders, 1);
  click('b');
  assert.deepEqual(
    order.map(p => p.enabled),
    [false, false, false, true],
  );
  click('c');
  click('a');
  assert.deepEqual(
    order.map(p => p.enabled),
    [true, false, false, true],
  );
  preset.extensions.baibaiToolkit.presetPromptGroups.groups[0].selectionMode = 'multiple';
  click('b');
  assert.deepEqual(
    order.map(p => p.enabled),
    [true, true, false, true],
  );
  preset.extensions.baibaiToolkit.presetPromptGroups.groups[0].selectionMode = 'single';
  manager.getPromptOrderForCharacter = () => {
    throw new Error('host failed');
  };
  const before = saves;
  click('a');
  assert.equal(saves, before);
  assert.match(error.message, /host failed/);
  stop();
  assert.equal(capture, undefined);
});
