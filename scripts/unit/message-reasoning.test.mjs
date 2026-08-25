/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const reasoning = await loadModule('../../src/util/messageReasoning.ts');
const readerStoreSource = await readFile(new URL('../../src/store/reader.ts', import.meta.url), 'utf8');
const readerAppSource = await readFile(new URL('../../src/apps/reader/ReaderApp.vue', import.meta.url), 'utf8');
const archiveSource = await readFile(new URL('../../src/apps/archive/ChatArchiveApp.vue', import.meta.url), 'utf8');
const archiveFloorBackupPageSource = await readFile(
  new URL('../../src/apps/archive/ChatArchiveFloorBackupPage.vue', import.meta.url),
  'utf8',
);

test('message reasoning extraction supports direct, nested, object and cyclic payloads', () => {
  assert.equal(reasoning.extractMessageReasoning({ reasoning_content: '  直接思维链  ' }), '直接思维链');
  assert.equal(reasoning.extractMessageReasoning({ extra: { data: { thinking: '嵌套思维链' } } }), '嵌套思维链');
  assert.equal(reasoning.extractMessageReasoning({ data: { reasoning: { content: '对象思维链' } } }), '对象思维链');
  const cyclic = { message: '普通正文' };
  cyclic.extra = cyclic;
  assert.equal(reasoning.extractMessageReasoning(cyclic), '');
});

test('reader normalization retains reasoning through its typed message pipeline', () => {
  assert.match(readerStoreSource, /export interface ReaderMessage\s*\{[\s\S]*?reasoning:\s*string;/u);
  assert.match(readerStoreSource, /interface PendingReaderMessage\s*\{[\s\S]*?reasoning:\s*string;/u);
  assert.match(readerStoreSource, /reasoning:\s*extractMessageReasoning\(record\)/u);
  assert.match(readerAppSource, /:reasoning="activeSwipeCandidate\?\.reasoning \|\| ''"/u);
});

test('chat archive and reader share one reasoning extractor', () => {
  assert.match(archiveFloorBackupPageSource, /import \{ extractMessageReasoning \} from '@\/util\/messageReasoning';/u);
  assert.match(archiveFloorBackupPageSource, /return extractMessageReasoning\(message\);/u);
  assert.doesNotMatch(`${archiveSource}\n${archiveFloorBackupPageSource}`, /function findReasoningValue/u);
});
