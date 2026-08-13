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

const { findReaderTextOccurrences } = await loadModule('../../src/util/readerTextEdit.ts');
const { resolveReaderBodySourceRange } = await loadModule('../../src/util/readerRegex.ts');

test('reader text editor preserves every repeated occurrence by exact offset', () => {
  const body = '第一句有月亮。第二句也有月亮，月亮很亮。';
  const occurrences = findReaderTextOccurrences(body, '月亮');
  assert.deepEqual(
    occurrences.map(item => item.offset),
    [4, 12, 15],
  );
  assert.equal(occurrences[1].sentence, '第二句也有月亮，月亮很亮。');
  assert.equal(occurrences[2].sentenceStart, occurrences[1].sentenceStart);
});

test('reader body source range uses the regex capture instead of searching duplicate body text', () => {
  const raw = '<title>月亮</title>\n<body>  月亮。月亮。  </body>\n<note>月亮。月亮。</note>';
  const body = '月亮。月亮。';
  const range = resolveReaderBodySourceRange(
    raw,
    body,
    { find: '<body>([\\s\\S]*?)</body>', flags: '', replace: '$1' },
    'body-rule',
  );
  assert.ok(range);
  assert.equal(raw.slice(range.start, range.end), body);
  assert.equal(range.ruleId, 'body-rule');
});

test('reader body source range refuses display-only replacement text', () => {
  const range = resolveReaderBodySourceRange(
    '<body>原文</body>',
    '替换后的显示文字',
    { find: '<body>([\\s\\S]*?)</body>', flags: '', replace: '固定显示文字' },
  );
  assert.equal(range, null);
});
