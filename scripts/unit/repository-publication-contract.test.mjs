/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const safePushSource = await readFile(new URL('../safe-push-dist.ps1', import.meta.url), 'utf8');

test('safe push treats the three current documents as the explicit publication boundary', () => {
  assert.match(
    safePushSource,
    /\$rootDocumentationPaths\s*=\s*@\([\s\S]*'docs\/CURRENT\.md'[\s\S]*'docs\/DECISIONS\.md'[\s\S]*'docs\/CODEMAP\.md'[\s\S]*\)/u,
  );
  assert.match(safePushSource, /Get-ChildItem\s+-LiteralPath\s+'docs'\s+-File\s+-Filter\s+'\*\.md'/u);
  assert.match(safePushSource, /Test-SamePathSet -Left \$rootDocumentationPaths -Right \$actualRootDocumentationPaths/u);
  assert.match(safePushSource, /\$allowedNewExactPaths\s*=\s*@\(\$rootDocumentationPaths\)\s*\+\s*@\(/u);
  assert.match(
    safePushSource,
    /\$allowedPublishPaths\s*=\s*@\('src'\)\s*\+\s*@\(\$rootDocumentationPaths\)\s*\+\s*@\(/u,
  );
  const prefixBlock = safePushSource.match(/\$allowedNewPrefixes\s*=\s*@\([\s\S]*?\n\)/u)?.[0] ?? '';
  assert.doesNotMatch(prefixBlock, /^\s*'docs\/',?\s*$/mu);
  assert.doesNotMatch(safePushSource, /'docs\/execution(?:\/|')/u);
});

test('repository documentation publishes only the three current context files', async () => {
  const [current, decisions, codemap] = await Promise.all(
    ['CURRENT.md', 'DECISIONS.md', 'CODEMAP.md'].map(name =>
      readFile(new URL(`../../docs/${name}`, import.meta.url), 'utf8'),
    ),
  );
  assert.match(current, /当前有效规则/u);
  assert.match(decisions, /关键架构决策/u);
  assert.match(codemap, /当前真实代码结构/u);
});
