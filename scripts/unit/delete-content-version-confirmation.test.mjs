/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function transpile(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
}

function toDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

const { deleteContentVersionWithConfirmation } = await import(
  toDataUrl(await transpile('../../src/util/deleteContentVersion.ts'))
);

const versions = [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }];

function baseOptions(overrides = {}) {
  const calls = { activate: [], confirm: [], notify: [], remove: 0 };
  const options = {
    activate: previous => calls.activate.push(previous.id),
    confirmNotice: async (message, settings) => {
      calls.confirm.push({ message, settings });
      return true;
    },
    entityLabel: '书信',
    note: '只会删除这个版本。',
    remove: () => {
      calls.remove += 1;
      return { entry: { id: 'book_1' }, activeVersionId: 'v1' };
    },
    versions,
    versionId: 'v2',
    ...overrides,
  };
  return { calls, options };
}

test('deleteContentVersionWithConfirmation asks with the app label and note', async () => {
  const { calls, options } = baseOptions();
  const outcome = await deleteContentVersionWithConfirmation(options);
  assert.equal(outcome.status, 'deleted');
  assert.equal(outcome.previousVersionId, 'v1');
  assert.deepEqual(calls.confirm, [
    {
      message: '要删除当前查看的书信版本 2/3 吗？只会删除这个版本。',
      settings: { confirmLabel: '删除此版本', kind: 'warning' },
    },
  ]);
  assert.deepEqual(calls.activate, ['v1']);
});

test('deleteContentVersionWithConfirmation lets an app override the wording', async () => {
  const { calls, options } = baseOptions({
    confirmLabel: '删除版本',
    confirmMessage: () => '要删除这篇日记的当前版本吗？',
    entityLabel: '日记',
    successMessage: '已删除该版本',
  });
  let successMessage = '';
  options.notifySuccess = message => {
    successMessage = message;
  };
  await deleteContentVersionWithConfirmation(options);
  assert.equal(calls.confirm[0].message, '要删除这篇日记的当前版本吗？');
  assert.equal(calls.confirm[0].settings.confirmLabel, '删除版本');
  assert.equal(successMessage, '已删除该版本');
});

test('deleteContentVersionWithConfirmation stops on cancel and on the last version', async () => {
  const cancelled = baseOptions({ confirmNotice: async () => false });
  const cancelledOutcome = await deleteContentVersionWithConfirmation(cancelled.options);
  assert.equal(cancelledOutcome.status, 'cancelled');
  assert.equal(cancelled.calls.remove, 0);

  const last = baseOptions({ versions: [{ id: 'v1' }], versionId: 'v1' });
  const lastOutcome = await deleteContentVersionWithConfirmation(last.options);
  assert.equal(lastOutcome.status, 'rejected');
  assert.equal(last.calls.confirm.length, 0);
  assert.equal(last.calls.remove, 0);
});
