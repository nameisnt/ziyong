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

const { completeFailedDraftReparse, readFailedDraftTarget } = await import(
  toDataUrl(await transpile('../../src/util/failedDraftReparse.ts'))
);

test('readFailedDraftTarget reads the rewrite target from every app payload shape', () => {
  assert.deepEqual(readFailedDraftTarget({ entryId: 'diary_1', versionId: 'v2' }), {
    entryId: 'diary_1',
    versionId: 'v2',
  });
  assert.deepEqual(readFailedDraftTarget({ chapterId: 'extra_1' }), { entryId: 'extra_1', versionId: '' });
  assert.deepEqual(readFailedDraftTarget({ threadId: 'thread_1', versionId: 'v1' }), {
    entryId: 'thread_1',
    versionId: 'v1',
  });
  assert.deepEqual(readFailedDraftTarget({ entryId: '', chapterId: 'extra_2' }), {
    entryId: 'extra_2',
    versionId: '',
  });
  assert.deepEqual(readFailedDraftTarget({}), { entryId: '', versionId: '' });
});

test('completeFailedDraftReparse keeps the original finish order', () => {
  const calls = [];
  completeFailedDraftReparse({
    deleteDraft: id => calls.push(`delete:${id}`),
    draft: { id: 'draft_1' },
    navigate: () => calls.push('navigate'),
    persistDraft: () => calls.push('persist'),
    preview: { action: 'rewrite', targetEntryId: 'diary_1' },
    rawOutput: 'raw',
    setPreview: preview => calls.push(`preview:${preview.action}`),
    updateDraft: (id, patch) => calls.push(`update:${id}:${patch.rawOutput}:${patch.warnings.length}`),
    warnings: ['w1'],
  });
  assert.deepEqual(calls, ['update:draft_1:raw:1', 'preview:rewrite', 'persist', 'delete:draft_1', 'navigate']);
});

test('completeFailedDraftReparse hands the same preview object to the app', () => {
  const preview = { action: 'generate' };
  let received = null;
  completeFailedDraftReparse({
    deleteDraft: () => {},
    draft: { id: 'draft_2' },
    navigate: () => {},
    persistDraft: () => {},
    preview,
    rawOutput: '',
    setPreview: value => {
      received = value;
    },
    updateDraft: () => {},
    warnings: [],
  });
  assert.equal(received, preview);
});
