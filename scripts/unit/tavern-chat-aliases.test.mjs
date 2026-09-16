/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { computed, effectScope, onScopeDispose, reactive, ref, watch } from 'vue';
import { z } from 'zod';

const source = await readFile(new URL('../../src/util/tavernChatAliases.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const { installTavernAliasProvider, installNativeUserMacro, getTavernAliasUnavailableReason } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

test('native macro follows the global link across chats and stops after reload', async () => {
  const storeSource = await readFile(new URL('../../src/store/generationAliases.ts', import.meta.url), 'utf8');
  const compiled = transpileModule(storeSource, {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  const definitions = new Map();
  let currentScope = 'chat:a';
  const scopeKey = ref(currentScope);
  let data;
  let schema;
  const settings = reactive({ settings: { nativeUserPrefixLink: null } });
  const context = {
    name1: 'user',
    name2: 'character',
    powerUserSettings: { experimental_macro_engine: true },
    macros: {
      registry: {
        registerMacro: (key, value) => definitions.set(key, value),
        unregisterMacro: key => definitions.delete(key),
      },
      envBuilder: { registerProvider() {} },
    },
  };
  const modules = {
    '@/store/settings': { useSettingsStore: () => settings },
    '@/store/chatScoped': {
      getCurrentChatScopeKey: () => currentScope,
      isPlaceholderChatScopeKey: key => key === 'none',
      useChatScopedDomain: options => {
        schema = options.schema;
        data = ref(options.createDefault());
        return { data, scopeKey };
      },
    },
    '@/util/tavernChatAliases': { installNativeUserMacro, installTavernAliasProvider, getTavernAliasUnavailableReason },
    '@/util/zod': { validateInplace: (schema, value) => schema.parse(value) },
    '@/util/runtime': { getSillyTavernContext: () => context },
  };
  const exports = {};
  new Function('require', 'exports', 'defineStore', 'z', 'computed', 'ref', 'watch', 'onScopeDispose', compiled)(
    key => modules[key],
    exports,
    (_id, setup) => setup,
    z,
    computed,
    ref,
    watch,
    onScopeDispose,
  );
  const scope = effectScope();
  try {
    const store = scope.run(() => exports.useGenerationAliasesStore());
    assert.equal(store.nativeUserMacroEnabled.value, false);
    assert.equal(definitions.size, 0);
    settings.settings.nativeUserPrefixLink = { scriptId: 'script', originalPrefix: '{{user}}: ' };
    assert.equal(definitions.get('pc_native_user').handler(), 'user');
    context.name1 = 'renamed';
    assert.equal(definitions.get('pc_native_user').handler(), 'renamed');
    const savedA = { ...data.value };
    currentScope = 'chat:b';
    scopeKey.value = currentScope;
    data.value = schema.parse({});
    assert.equal(definitions.get('pc_native_user').handler(), 'renamed');
    currentScope = 'chat:a';
    scopeKey.value = currentScope;
    data.value = savedA;
    assert.equal(definitions.get('pc_native_user').handler(), 'renamed');
    settings.settings.nativeUserPrefixLink = null;
    assert.equal(store.nativeUserMacroEnabled.value, false);
    assert.equal(definitions.get('pc_native_user').handler(), 'renamed');
  } finally {
    scope.stop();
  }
  assert.equal(definitions.size, 0);
  const reloaded = effectScope();
  try {
    reloaded.run(() => exports.useGenerationAliasesStore());
    assert.equal(definitions.size, 0);
  } finally {
    reloaded.stop();
  }
});

test('native user macro reads the current native identity and unregisters on disposal', () => {
  const definitions = new Map();
  let name = 'Native User';
  const stop = installNativeUserMacro(
    {
      registerMacro: (key, definition) => definitions.set(key, definition),
      unregisterMacro: key => definitions.delete(key),
    },
    () => name,
  );
  const macro = definitions.get('pc_native_user');
  assert.equal(macro.handler(), 'Native User');
  assert.equal(fixture().evaluate().names.user, 'User $1');
  assert.equal(macro.handler(), 'Native User');
  name = 'Another $& User';
  assert.equal(macro.handler(), name);
  stop();
  assert.equal(definitions.size, 0);
});

function fixture() {
  let readerState = {
    charReplacement: 'Alias $&',
    userReplacement: 'User $1',
    nativeChar: 'Native Char',
    nativeUser: 'Native User',
  };
  const callbacks = [];
  const builder = { registerProvider: fn => callbacks.push(fn) };
  const stop = installTavernAliasProvider(builder, () => readerState);
  function evaluate(raw = {}) {
    const env = {
      names: {
        char: raw.name2Override ?? 'Native Char',
        user: raw.name1Override ?? 'Native User',
        group: 'Original Group',
      },
      content: 'fixed text',
    };
    callbacks.forEach(fn => fn(env, raw));
    return env;
  }
  return {
    evaluate,
    stop,
    callbacks,
    setState: value => {
      readerState = value;
    },
  };
}

test('provider replaces only char/user names literally, preserving group and content', () => {
  const f = fixture();
  assert.deepEqual(f.evaluate(), {
    names: { char: 'Alias $&', user: 'User $1', group: 'Original Group' },
    content: 'fixed text',
  });
});
test('disabled or stale scope reader leaves the native environment alone', () => {
  const f = fixture();
  f.setState(null);
  assert.equal(f.evaluate().names.char, 'Native Char');
});
test('blank values inherit native names and explicit other identities are not overwritten', () => {
  const f = fixture();
  assert.deepEqual(f.evaluate({ name1Override: 'Other User', name2Override: 'Other Character' }).names, {
    char: 'Other Character',
    user: 'Other User',
    group: 'Original Group',
  });
  assert.equal(f.evaluate({ name2Override: 'Native Char' }).names.char, 'Alias $&');
  f.setState({ charReplacement: '', userReplacement: ' ', nativeChar: 'Native Char', nativeUser: 'Native User' });
  assert.equal(f.evaluate().names.char, 'Native Char');
  assert.equal(f.evaluate().names.user, 'Native User');
});
test("dispose releases the reader, without removing someone else's provider", () => {
  const f = fixture();
  f.stop();
  assert.equal(f.evaluate().names.char, 'Native Char');
  assert.equal(f.callbacks.length, 1);
});
test('host capability and disabled engine are explicit unsupported states', () => {
  assert.match(getTavernAliasUnavailableReason({}), /不支持/);
  const context = {
    macros: { envBuilder: { registerProvider() {} } },
    powerUserSettings: { experimental_macro_engine: false },
  };
  assert.match(getTavernAliasUnavailableReason(context), /新宏引擎/);
  context.powerUserSettings.experimental_macro_engine = true;
  assert.equal(getTavernAliasUnavailableReason(context), '');
});
