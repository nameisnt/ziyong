/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/util/deleteContentVersion.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'deleteContentVersion.ts',
}).outputText;
const { deleteContentVersionWithFallback } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

function createVersions() {
  return [{ id: 'version-a' }, { id: 'version-b' }, { id: 'version-c' }];
}

function createOptions(overrides = {}) {
  const calls = { activate: [], navigate: [], notify: [], remove: 0 };
  const options = {
    versions: createVersions(),
    versionId: 'version-b',
    confirm: async () => true,
    confirmLabel: '删除此版本',
    confirmMessage: ({ index, total }) => `要删除 ${index}/${total} 吗？`,
    remove: () => {
      calls.remove += 1;
      return { removed: 'version-b' };
    },
    activate: previous => calls.activate.push(previous.id),
    navigate: (result, previous) => calls.navigate.push([result.removed, previous.id]),
    successMessage: '已删除该版本',
    notifySuccess: message => calls.notify.push(message),
    ...overrides,
  };
  return { calls, options };
}

test('deletes the chosen version and falls back to the previous one', async () => {
  const { calls, options } = createOptions();
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'deleted');
  assert.equal(outcome.previousVersionId, 'version-a');
  assert.deepEqual(calls.activate, ['version-a']);
  assert.deepEqual(calls.navigate, [['version-b', 'version-a']]);
  assert.deepEqual(calls.notify, ['已删除该版本']);
});

test('wraps around to the last version when the first one is removed', async () => {
  const { calls, options } = createOptions({ versionId: 'version-a' });
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'deleted');
  assert.equal(outcome.previousVersionId, 'version-c');
  assert.deepEqual(calls.activate, ['version-c']);
});

test('refuses to delete the only version', async () => {
  const { calls, options } = createOptions({ versions: [{ id: 'only' }], versionId: 'only' });
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'rejected');
  assert.equal(calls.remove, 0);
});

test('refuses unknown version ids', async () => {
  const { calls, options } = createOptions({ versionId: 'missing' });
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'rejected');
  assert.equal(calls.remove, 0);
});

test('cancelling the confirmation leaves the versions alone', async () => {
  const { calls, options } = createOptions({ confirm: async () => false });
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'cancelled');
  assert.equal(calls.remove, 0);
  assert.deepEqual(calls.navigate, []);
});

test('a rejection from the store does not navigate or notify', async () => {
  const { calls, options } = createOptions({ remove: () => null });
  const outcome = await deleteContentVersionWithFallback(options);
  assert.equal(outcome.status, 'rejected');
  assert.deepEqual(calls.activate, []);
  assert.deepEqual(calls.navigate, []);
  assert.deepEqual(calls.notify, []);
});
