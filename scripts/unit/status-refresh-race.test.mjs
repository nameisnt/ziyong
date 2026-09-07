/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { createSourceFile, ScriptTarget } from 'typescript';

const source = await readFile(new URL('../../src/apps/status-display/StatusDisplayApp.vue', import.meta.url), 'utf8');
const script = source.split('<script setup lang="ts">')[1].split('</script>')[0];
const ast = createSourceFile('status.ts', script, ScriptTarget.Latest, true);
const refresh = ast.statements.find(node => node.name?.getText(ast) === 'refreshStatus').getText(ast);

function fixture() {
  const pending = [];
  const context = {
    refreshRevision: 0,
    renderedHtml: { value: '' },
    errorMessage: { value: '' },
    loading: { value: false },
    activeScheme: { value: { source: 'mvu' } },
    phone: { isViewingCurrentChat: true },
    loadMvuStatus: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
    loadRegexStatus: () => 'regex result',
    Error,
  };
  return { context, pending, run: runInNewContext(`${refresh}; refreshStatus`, context) };
}

for (const reason of ['no scheme', 'historical chat']) {
  test(`pending refresh followed by ${reason} stops loading and rejects stale output`, async () => {
    const f = fixture();
    const first = f.run();
    assert.equal(f.context.loading.value, true);
    if (reason === 'no scheme') f.context.activeScheme.value = null;
    else f.context.phone.isViewingCurrentChat = false;
    await f.run();
    assert.equal(f.context.loading.value, false);
    f.pending[0].resolve('stale');
    await first;
    assert.equal(f.context.renderedHtml.value, '');
    assert.equal(f.context.loading.value, false);
  });
}

test('an older request cannot clear the current loading state or replace its result', async () => {
  const f = fixture();
  const first = f.run();
  const second = f.run();
  f.pending[0].resolve('old');
  await first;
  assert.equal(f.context.loading.value, true);
  f.pending[1].resolve('new');
  await second;
  assert.equal(f.context.loading.value, false);
  assert.equal(f.context.renderedHtml.value, 'new');
});

test('failure clears loading and a subsequent refresh succeeds', async () => {
  const f = fixture();
  const first = f.run();
  f.pending[0].reject(new Error('test failure'));
  await first;
  assert.equal(f.context.loading.value, false);
  assert.equal(f.context.errorMessage.value, 'test failure');
  f.context.activeScheme.value = { source: 'regex' };
  await f.run();
  assert.equal(f.context.errorMessage.value, '');
  assert.equal(f.context.renderedHtml.value, 'regex result');
});
