/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../../docs/', import.meta.url);
const currentNames = ['CODEMAP.md', 'CURRENT.md', 'DECISIONS.md'];

test('documentation exposes exactly three current markdown entry points', async () => {
  const rootEntries = await readdir(docsRoot, { withFileTypes: true });
  const rootMarkdown = rootEntries
    .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(rootMarkdown, currentNames);

  const [codemap, current, decisions] = await Promise.all(
    currentNames.map(name => readFile(new URL(name, docsRoot), 'utf8')),
  );
  assert.match(codemap, /当前真实代码结构|当前源码/u);
  assert.match(current, /只以 `CURRENT\.md`、`DECISIONS\.md`、`CODEMAP\.md`/u);
  assert.ok((current.match(/^\d+\./gmu) ?? []).length <= 50);
  assert.match(decisions, /ADR-001 文档入口收敛为三份当前文件/u);
});

test('superseded documentation is archived and explicitly excluded from construction context', async () => {
  const archive = new URL('archive/', docsRoot);
  await access(archive);
  const archiveEntries = await readdir(archive);
  assert.ok(archiveEntries.length > 0);

  const [codemap, current, decisions] = await Promise.all(
    currentNames.map(name => readFile(new URL(name, docsRoot), 'utf8')),
  );
  for (const source of [current, decisions, codemap]) {
    assert.match(source, /archive/u);
  }
  assert.match(current, /不作为施工依据/u);
  assert.match(decisions, /不得作为施工依据/u);
  assert.match(codemap, /不得直接执行/u);
});

test('local links in the three current documents resolve', async () => {
  for (const name of currentNames) {
    const documentUrl = new URL(name, docsRoot);
    const source = await readFile(documentUrl, 'utf8');
    const targets = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map(match => match[1]);
    for (const target of targets) {
      if (/^(?:https?:|mailto:|#)/u.test(target)) continue;
      await access(new URL(target, documentUrl));
    }
  }
});
