/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { removeContentVersion } = await loadModule('../../src/util/contentVersions.ts');
const { synchronizeExtraChapterGenerationRecords } = await loadModule('../../src/util/extraGenerationRecords.ts');

function createRecord(id) {
  return { id, sourceMode: 'latest' };
}

test('deleting the active content version selects the preceding version and keeps its generation record', () => {
  const versions = [
    { content: '初稿', generationRecord: createRecord('record-1'), id: 'version-1', origin: 'original' },
    { content: '改稿', generationRecord: createRecord('record-2'), id: 'version-2', origin: 'rewrite' },
    { content: '终稿', generationRecord: createRecord('record-3'), id: 'version-3', origin: 'rewrite' },
  ];

  const removed = removeContentVersion(versions, 'version-3', 'version-3');

  assert.ok(removed);
  assert.equal(removed.activeVersionId, 'version-2');
  assert.equal(removed.activeVersion.generationRecord.id, 'record-2');
  assert.equal(removed.removedVersion.generationRecord.id, 'record-3');
  assert.deepEqual(
    removed.versions.map(version => version.id),
    ['version-1', 'version-2'],
  );
});

test('extra chapter generation records are rebuilt from surviving versions without stale deleted records', () => {
  const chapter = {
    generationRecords: [createRecord('record-1'), createRecord('record-2'), createRecord('record-3')],
    versions: [
      { generationRecord: createRecord('record-1'), id: 'version-1' },
      { generationRecord: createRecord('record-2'), id: 'version-2' },
    ],
  };

  const changed = synchronizeExtraChapterGenerationRecords(chapter);

  assert.equal(changed, true);
  assert.deepEqual(
    chapter.generationRecords.map(record => record.id),
    ['record-1', 'record-2'],
  );
  assert.equal(synchronizeExtraChapterGenerationRecords(chapter), false);
});
