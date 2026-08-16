/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = [
  'src/components/summary/useSummaryGenerationActions.ts',
  'src/components/DiaryApp.vue',
  'src/components/LettersApp.vue',
  'src/components/TheaterApp.vue',
  'src/components/forum/useForumGenerationActions.ts',
  'src/components/extras/useExtrasGenerationActions.ts',
];
const consumers = await Promise.all(
  files.map(async file => ({ file, source: await readFile(new URL(`../../${file}`, import.meta.url), 'utf8') })),
);
const summaryBatch = await readFile(
  new URL('../../src/components/summary/useSummaryBatchSession.ts', import.meta.url),
  'utf8',
);

test('GEN02D content consumers delegate ordinary single requests to persistent sessions', () => {
  for (const { file, source } of consumers) {
    assert.match(source, /useSingleGenerationTaskSession/, file);
    assert.match(source, /\.create\(/, file);
    assert.match(source, /\.lifecycle\(task\.id\)/, file);
    assert.match(source, /\.complete\(task\.id,/, file);
    assert.match(source, /\.fail\(task\.id,/, file);
  }
});

test('GEN02D content consumers no longer own generation ids or unload-stop text requests', () => {
  for (const { file, source } of consumers) {
    assert.doesNotMatch(source, /stopGenerationByIdSafe/, file);
    assert.doesNotMatch(source, /generationId:\s*''/, file);
    assert.doesNotMatch(source, /onScopeDispose\([\s\S]*?stopGeneration/s, file);
  }
});

test('GEN02D retains all single action identities while batch kinds remain outside single sessions', () => {
  const joined = consumers.map(item => item.source).join('\n');
  for (const actionId of [
    'summary.generate',
    'diary.generate',
    'diary.read-reaction',
    'letters.generate',
    'theater.generate',
    'forum.generate-thread',
    'forum.generate-replies',
    'extras.chapter-generate',
    'extras.chapter-summary',
  ]) {
    assert.match(joined, new RegExp(`actionId:\\s*'${actionId.split('.')[1]}'`), actionId);
  }
  assert.match(summaryBatch, /kind:\s*'summary-batch'/);
  assert.doesNotMatch(summaryBatch, /useSingleGenerationTaskSession/);
});
