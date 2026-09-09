/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';

const source = await readFile(new URL('../../src/util/statusFrameRuntime.ts', import.meta.url), 'utf8');
const code = transpileModule(source, {
  compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 },
}).outputText.replace(/^import .*?;\s*$/gm, '');
const load = new Function(
  'getLastMessageIdSafe',
  'getOptionalGlobalValue',
  'getOptionalGlobalFunction',
  'getSillyTavernContext',
  'onRuntimeEvent',
  'resolveMvuRuntime',
  code.replace(/export /g, '') + '; return { createStatusFrameHost, createStatusBridgeScript };',
);

function fixture() {
  const listeners = new Map();
  const globals = { tavern_events: { MESSAGE_RECEIVED: 'message_received' } };
  let resolve;
  const mvu = new Promise(r => {
    resolve = r;
  });
  const module = load(
    () => 9,
    key => globals[key],
    () => null,
    () => ({}),
    (event, callback) => {
      listeners.set(callback, event);
      return { stop: () => listeners.delete(callback) };
    },
    () => mvu,
  );
  return { ...module, listeners, globals, resolve };
}

test('current floor and latest retain different meanings; subscriptions are frame-owned', () => {
  const f = fixture();
  const host = f.createStatusFrameHost(2);
  assert.equal(host.getCurrentMessageId(), 2);
  assert.equal(host.getLastMessageId(), 9);
  assert.equal(f.createStatusFrameHost('latest').getCurrentMessageId(), 9);
  const other = f.createStatusFrameHost(4);
  let count = 0;
  host.eventOn('test', () => count++);
  other.eventOn('test', () => count++);
  const oldCallback = [...f.listeners.keys()][0];
  host.dispose();
  assert.equal(f.listeners.size, 1);
  oldCallback();
  assert.equal(count, 0);
  assert.throws(() => host.eventOn('test', () => {}), /关闭/);
  other.dispose();
  assert.equal(f.listeners.size, 0);
});

test('late MVU initialization cannot resurrect a disposed frame', async () => {
  const f = fixture();
  const host = f.createStatusFrameHost(2);
  const waiting = host.waitGlobalInitialized('Mvu');
  host.dispose();
  f.resolve({ getMvuData() {} });
  await assert.rejects(waiting, /关闭/);
});

test('MVU initialization returns the existing runtime, without creating a data copy', async () => {
  const f = fixture();
  const mvu = { getMvuData() {}, replaceMvuData() {} };
  const host = f.createStatusFrameHost(2);
  f.resolve(mvu);
  assert.equal(await host.waitGlobalInitialized('Mvu'), mvu);
});
