/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const safePushSource = await readFile(new URL('../safe-push-dist.ps1', import.meta.url), 'utf8');

test('safe push treats root markdown files as the explicit formal documentation boundary', () => {
  assert.match(safePushSource, /\$rootDocumentationPaths\s*=/u);
  assert.match(safePushSource, /Get-ChildItem\s+-LiteralPath\s+'docs'\s+-File\s+-Filter\s+'\*\.md'/u);
  assert.match(safePushSource, /\$allowedNewExactPaths\s*=\s*@\(\$rootDocumentationPaths\)\s*\+\s*@\(/u);
  assert.match(
    safePushSource,
    /\$allowedPublishPaths\s*=\s*@\('src'\)\s*\+\s*@\(\$rootDocumentationPaths\)\s*\+\s*@\(/u,
  );
  const prefixBlock = safePushSource.match(/\$allowedNewPrefixes\s*=\s*@\([\s\S]*?\n\)/u)?.[0] ?? '';
  assert.doesNotMatch(prefixBlock, /^\s*'docs\/',?\s*$/mu);
});

test('repository documentation has one lifecycle index', async () => {
  const documentationIndex = await readFile(new URL('../../docs/README.md', import.meta.url), 'utf8');

  assert.match(documentationIndex, /长期规范/u);
  assert.match(documentationIndex, /当前方案/u);
  assert.match(documentationIndex, /历史方案/u);
  assert.match(documentationIndex, /执行记录/u);
  assert.match(documentationIndex, /15-仓库整理与发布收口方案/u);
});
