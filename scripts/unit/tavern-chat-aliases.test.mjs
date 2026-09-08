/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/util/tavernChatAliases.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText;
const { installTavernAliasProvider, getTavernAliasUnavailableReason } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

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
