/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transpileModule, ModuleKind } from 'typescript';

const source = await readFile(new URL('../../src/util/nativeUserPrefixLink.ts', import.meta.url), 'utf8');
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
function fixture(trees) {
  let stored = structuredClone(trees);
  let fail = false;
  const exports = {};
  new Function('require', 'exports', compiled)(
    () => ({
      getOptionalGlobalFunction: () => (update, options) => {
        assert.equal(options.type, 'global');
        if (fail) throw new Error('write failed');
        stored = update(structuredClone(stored));
        return stored;
      },
    }),
    exports,
  );
  return {
    change: exports.setNativeUserPrefixLink,
    read: () => stored,
    fail: () => {
      fail = true;
    },
  };
}
const script = {
  type: 'script',
  id: 'compression',
  name: 'compression',
  enabled: true,
  content: "import 'https://example.test/压缩相邻消息/index.js'",
  data: { chat_history: { user_prefix: 'original $&: ', assistant_prefix: 'story: ' }, other: 'keep' },
};

test('global link restores the exact original prefix and preserves all other script fields', () => {
  const original = [{ type: 'folder', enabled: true, scripts: [script] }];
  const f = fixture(original);
  const link = f.change(null);
  assert.deepEqual(link, { scriptId: 'compression', originalPrefix: 'original $&: ' });
  assert.equal(f.read()[0].scripts[0].data.chat_history.user_prefix, '{{pc_native_user}}: ');
  assert.equal(f.change(link), null);
  assert.deepEqual(f.read(), original);
});

test('missing, disabled and ambiguous scripts do not change settings', () => {
  for (const trees of [[], [{ ...script, enabled: false }], [script, { ...script, id: 'other' }]]) {
    const f = fixture(trees);
    assert.throws(() => f.change(null));
    assert.deepEqual(f.read(), trees);
  }
});

test('changed prefixes and missing originals are not overwritten on disable', () => {
  const link = { scriptId: 'compression', originalPrefix: 'before: ' };
  const f = fixture([script]);
  assert.throws(() => f.change(link), /前缀已被修改/);
  assert.deepEqual(f.read(), [script]);
  assert.throws(() => fixture([]).change(link), /不存在/);
});

test('failed writes do not return a new link state', () => {
  const f = fixture([script]);
  f.fail();
  assert.throws(() => f.change(null), /write failed/);
  assert.deepEqual(f.read(), [script]);
});
