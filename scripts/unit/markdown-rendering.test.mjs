/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../../src/util/markdown.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'markdown.ts',
}).outputText;
const { renderMarkdown } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('consecutive ordered Markdown items remain one numbered list', () => {
  assert.equal(renderMarkdown('1. first\n2. second'), '<ol><li>first</li><li>second</li></ol>');
});

test('switching between unordered and ordered lists preserves both list types', () => {
  assert.equal(
    renderMarkdown('- alpha\n- beta\n1. first\n2. second'),
    '<ul><li>alpha</li><li>beta</li></ul><ol><li>first</li><li>second</li></ol>',
  );
});
