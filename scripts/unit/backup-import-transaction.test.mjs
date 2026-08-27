/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadBackupTransaction() {
  const source = await readFile(new URL('../../src/util/backupTransaction.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: 'backupTransaction.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { executeBackupImportTransaction } = await loadBackupTransaction();

test('backup import commits, rehydrates, then persists as one transaction', async () => {
  const calls = [];
  await executeBackupImportTransaction({
    captureSnapshot: () => ({ previous: true }),
    commit: () => calls.push('commit'),
    persist: async () => calls.push('persist'),
    rehydrate: () => calls.push('rehydrate'),
    restoreSnapshot: () => calls.push('restore'),
  });

  assert.deepEqual(calls, ['commit', 'rehydrate', 'persist']);
});

test('a failed commit restores the snapshot and rehydrates the original state', async () => {
  const calls = [];
  const failure = new Error('domain write failed');
  await assert.rejects(
    executeBackupImportTransaction({
      captureSnapshot: () => ({ previous: true }),
      commit: () => {
        calls.push('commit');
        throw failure;
      },
      persist: async () => calls.push('persist'),
      rehydrate: () => calls.push('rehydrate'),
      restoreSnapshot: () => calls.push('restore'),
    }),
    error => error === failure,
  );

  assert.deepEqual(calls, ['commit', 'restore', 'rehydrate', 'persist']);
});

test('a persistence failure restores and persists the original snapshot', async () => {
  const calls = [];
  const failure = new Error('save failed');
  let persistCalls = 0;
  await assert.rejects(
    executeBackupImportTransaction({
      captureSnapshot: () => ({ previous: true }),
      commit: () => calls.push('commit'),
      persist: async () => {
        persistCalls += 1;
        calls.push(`persist-${persistCalls}`);
        if (persistCalls === 1) throw failure;
      },
      rehydrate: () => calls.push('rehydrate'),
      restoreSnapshot: () => calls.push('restore'),
    }),
    error => error === failure,
  );

  assert.deepEqual(calls, ['commit', 'rehydrate', 'persist-1', 'restore', 'rehydrate', 'persist-2']);
});

test('a rollback failure preserves both the original and rollback errors', async () => {
  const primary = new Error('primary failure');
  const rollback = new Error('rollback rehydrate failure');
  let rehydrateCalls = 0;

  await assert.rejects(
    executeBackupImportTransaction({
      captureSnapshot: () => ({ previous: true }),
      commit: () => {
        throw primary;
      },
      persist: async () => undefined,
      rehydrate: () => {
        rehydrateCalls += 1;
        if (rehydrateCalls === 1) throw rollback;
      },
      restoreSnapshot: () => undefined,
    }),
    error => error instanceof AggregateError && error.errors.includes(primary) && error.errors.includes(rollback),
  );
});
