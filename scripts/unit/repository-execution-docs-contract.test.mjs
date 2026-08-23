/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepositoryFile = relativePath =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const currentPaths = [
  'docs/execution/current/worktree.md',
  'docs/execution/current/defects.md',
  'docs/execution/current/batches.md',
  'docs/execution/current/traceability.md',
];

const legacyNames = [
  '00-工作树归属.md',
  '01-缺陷台账.md',
  '02-批次状态.md',
  '03-需求追踪与能力矩阵.md',
  '04-U01组件族清单.md',
  '05-当前发布候选清单.md',
];

test('execution documentation has one compact current state and one complete history slice', async () => {
  const currentFiles = await Promise.all(currentPaths.map(readRepositoryFile));
  assert.equal(currentFiles.length, 4);
  assert.match(currentFiles[0], /dbb4bca/u);
  assert.match(currentFiles[1], /D-REPO-PUBLISH-003/u);
  assert.match(currentFiles[2], /REPO03/u);
  assert.match(currentFiles[3], /REPO04/u);

  const archivedFiles = await Promise.all(
    legacyNames.map(name =>
      readRepositoryFile(`docs/execution/archive/2026-pre-repository-cleanup/${name}`),
    ),
  );
  assert.match(archivedFiles[0], /二百四十三、REPO03/u);
  assert.match(archivedFiles[1], /D-GEN-REASON-EDIT-01/u);
  assert.match(archivedFiles[2], /REPOCHECKPOINT01/u);
  assert.match(archivedFiles[3], /方案 15 仓库整理追踪/u);
  assert.match(archivedFiles[4], /U01 图标按钮名称组件族清单/u);
  assert.match(archivedFiles[5], /冻结时 40 个未跟踪文件逐项归属/u);
});

test('legacy numbered entries are redirects instead of a second current state', async () => {
  const legacyFiles = await Promise.all(
    legacyNames.map(name => readRepositoryFile(`docs/execution/${name}`)),
  );
  legacyFiles.forEach((source, index) => {
    assert.match(source, /archive\/2026-pre-repository-cleanup/u, legacyNames[index]);
    assert.ok(source.split(/\r?\n/u).length <= 10, legacyNames[index]);
  });

  const executionIndex = await readRepositoryFile('docs/execution/README.md');
  currentPaths.forEach(path => {
    assert.match(executionIndex, new RegExp(path.replace('docs/execution/', '').replace('.', '\\.')));
  });
  assert.match(executionIndex, /archive\/README\.md/u);
});

test('current, redirect and archive index links all resolve', async () => {
  const linkedDocumentPaths = [
    'docs/execution/README.md',
    ...currentPaths,
    ...legacyNames.map(name => `docs/execution/${name}`),
    'docs/execution/archive/README.md',
    'docs/execution/archive/2026-pre-repository-cleanup/README.md',
  ];

  for (const documentPath of linkedDocumentPaths) {
    const documentUrl = new URL(`../../${documentPath}`, import.meta.url);
    const source = await readFile(documentUrl, 'utf8');
    const targets = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map(match => match[1]);
    for (const target of targets) {
      if (/^(?:https?:|mailto:|#)/u.test(target)) {
        continue;
      }
      await access(new URL(target, documentUrl));
    }
  }
});
