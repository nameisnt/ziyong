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

const migration = await loadModule('../../src/util/previewDraftMigration.ts');
const storeSource = await readFile(new URL('../../src/store/previewDrafts.ts', import.meta.url), 'utf8');
const backupSource = await readFile(new URL('../../src/apps/builtinBackup.ts', import.meta.url), 'utf8');

const v1Draft = {
  appId: 'diary',
  createdAt: '2026-08-20T10:00:00.000Z',
  page: 'preview',
  preview: { content: '旧草稿正文' },
  routeParams: { bookId: 'book-1' },
  title: '生成预览',
  updatedAt: '2026-08-20T10:01:00.000Z',
};

test('preview draft v1 scope migrates to v3 without losing its payload and with a stable id', () => {
  const first = migration.migratePreviewDraftScopeData({ drafts: [v1Draft] });
  const second = migration.migratePreviewDraftScopeData({ drafts: [v1Draft] });
  assert.equal(first.schemaVersion, 3);
  assert.deepEqual(first.drafts[0].preview, v1Draft.preview);
  assert.deepEqual(first.drafts[0].routeParams, v1Draft.routeParams);
  assert.match(first.drafts[0].id, /^legacy:diary:preview:/);
  assert.equal(first.drafts[0].rawOutputSemantics, 'legacy-unknown');
  assert.equal(first.drafts[0].id, second.drafts[0].id);
});

test('preview-drafts v1 and v2 backups migrate every scope and keep chat envelope metadata', () => {
  const migrated = migration.migratePreviewDraftsBackupData(
    {
      __chatScoped: true,
      legacyScopeMigrations: { 'char:old:chat:1': 'char:new:chat:1' },
      scopes: {
        'char:new:chat:1': { drafts: [v1Draft] },
        'char:new:chat:2': { drafts: [] },
      },
    },
    1,
  );
  assert.equal(migrated.legacyScopeMigrations['char:old:chat:1'], 'char:new:chat:1');
  assert.equal(migrated.scopes['char:new:chat:1'].schemaVersion, 3);
  assert.equal(migrated.scopes['char:new:chat:2'].schemaVersion, 3);
  const v2 = migration.migratePreviewDraftsBackupData({ scopes: { current: { schemaVersion: 2, drafts: [v1Draft] } } }, 2);
  assert.equal(v2.scopes.current.schemaVersion, 3);
  assert.throws(() => migration.migratePreviewDraftsBackupData({}, 3), /不支持从 preview-drafts v3 迁移/);
});

test('store and backup domain register v3 with explicit raw-output semantics', () => {
  assert.match(storeSource, /id:\s*z\.string\(\)\.min\(1\)/);
  assert.match(storeSource, /rawOutputSemantics:\s*RawOutputSemanticsSchema\.default\('legacy-unknown'\)/);
  assert.match(storeSource, /schemaVersion:\s*z\.literal\(3\)/);
  assert.match(storeSource, /z\.preprocess\(raw => \{[\s\S]*?stripRetiredMediaPreviewDrafts\(raw\);[\s\S]*?return migratePreviewDraftScopeData\(raw\);/);
  assert.match(backupSource, /key:\s*'preview-drafts'[\s\S]*?migrateImport:\s*migratePreviewDraftsBackupData[\s\S]*?schemaVersion:\s*3/);
});
