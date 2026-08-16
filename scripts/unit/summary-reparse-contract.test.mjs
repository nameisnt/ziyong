/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/components/SummaryApp.vue', import.meta.url), 'utf8');
const catalog = await readFile(new URL('../../src/testing/visual/scenarioCatalog.ts', import.meta.url), 'utf8');
const runner = await readFile(new URL('../ui-visual-check.mjs', import.meta.url), 'utf8');

test('summary preview and failed-draft repair explicitly import their runtime XML parser', () => {
  assert.match(source, /import\s*{[^}]*parseSimpleXmlResult[^}]*}\s*from\s*['"]@\/util\/generation['"]/s);
  assert.equal((source.match(/parseSimpleXmlResult\(/g) ?? []).length, 2);
});

test('summary failed-draft repair has a dedicated browser behavior scenario', () => {
  assert.match(catalog, /['"]summary-failed-draft-reparse['"]/);
  assert.match(runner, /scenario === ['"]summary-failed-draft-reparse['"]/);
  assert.match(runner, /修复 XML 后保留的总结正文/);
});
