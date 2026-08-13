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

const cleaning = await loadModule('../../src/util/generationOutputCleaning.ts');
const theater = await loadModule('../../src/util/theaterMixedContent.ts');

test('output cleaning removes a configured closing tag and its prefix', () => {
  const result = cleaning.cleanGenerationOutput('<think>过程</think>\n<result>正文</result>', {
    enabled: true,
    endTags: '</think>',
  });
  assert.equal(result.content, '<result>正文</result>');
  assert.equal(result.matchedTag, '</think>');
  assert.equal(result.removedContent, '<think>过程</think>');
  assert.ok(result.removedLength > 0);
});

test('output cleaning leaves content untouched when no configured tag exists', () => {
  const raw = '<result>正文</result>';
  assert.equal(cleaning.cleanGenerationOutput(raw, { enabled: true, endTags: '</think>' }).content, raw);
});

test('output cleaning accepts tag names and removes adjacent configured closing tags', () => {
  const result = cleaning.cleanGenerationOutput('<think>过程</think>\n</analysis>\n<result>正文</result>', {
    enabled: true,
    endTags: 'think\nanalysis',
  });
  assert.equal(result.content, '<result>正文</result>');
  assert.equal(result.removedContent, '<think>过程</think>\n</analysis>');
});

test('theater mixed content renders only exact html fences as html segments', () => {
  const segments = theater.parseTheaterContentSegments(
    '前文\n```html\n<div>网页</div>\n```\n后文\n```HTML\n不执行\n```',
  );
  assert.deepEqual(
    segments.map(segment => segment.kind),
    ['text', 'html', 'text'],
  );
  assert.equal(segments[1].content, '<div>网页</div>');
  assert.match(segments[2].content, /```HTML/u);
});

test('theater mixed content accepts exact inline prefix and suffix', () => {
  const segments = theater.parseTheaterContentSegments('前文```html<div>网页</div>```后文');
  assert.deepEqual(segments, [
    { content: '前文', kind: 'text' },
    { content: '<div>网页</div>', kind: 'html' },
    { content: '后文', kind: 'text' },
  ]);
});

test('unclosed theater html fence remains normal text', () => {
  const segments = theater.parseTheaterContentSegments('前文\n```html\n<div>未闭合</div>');
  assert.deepEqual(segments, [{ content: '前文\n```html\n<div>未闭合</div>', kind: 'text' }]);
});
