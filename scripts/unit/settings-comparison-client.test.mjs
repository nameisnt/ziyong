/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { reactive } from 'vue';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/apps/recovery/settingsComparisonClient.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText.replace('./settingsComparison.worker.ts', 'file:///fixture/settingsComparison.worker.js');
const { createSettingsComparisonClient } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

test('real Vue reactive summaries cross the worker boundary as plain scalar metadata', async t => {
  const originalWorker = globalThis.Worker;
  t.after(() => {
    globalThis.Worker = originalWorker;
  });
  const received = [];
  globalThis.Worker = class {
    postMessage(message, transfer) {
      received.push(structuredClone(message, { transfer }));
      queueMicrotask(() => this.onmessage({ data: { result: undefined } }));
    }
    terminate() {}
  };
  const summary = reactive({ name: 'settings_default-user_20260911-120000.json', date: 123, size: 2 });
  assert.throws(() => structuredClone(summary), { name: 'DataCloneError' });
  const bytes = new TextEncoder().encode('{}').buffer;
  const client = createSettingsComparisonClient();
  try {
    await client.add(bytes, summary);
    assert.deepEqual(received[0].summary, { name: summary.name, date: 123, size: 2 });
    assert.equal(bytes.byteLength, 0);
    assert.equal(received[0].bytes.byteLength, 2);
  } finally {
    client.dispose();
  }
});
