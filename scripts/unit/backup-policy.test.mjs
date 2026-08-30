/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadBackupPolicy() {
  const source = await readFile(new URL('../../src/util/backupPolicy.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'backupPolicy.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const {
  analyzeBackupDomainCoverage,
  assertFullBackupImportAllowed,
  selectCurrentChatBackupDomains,
  selectGeneratedContentDomains,
} = await loadBackupPolicy();

const domains = [
  { category: 'configuration', key: 'global-config', scope: 'global' },
  { category: 'configuration', key: 'chat-config', scope: 'chat' },
  { category: 'content', key: 'content', scope: 'chat' },
  { category: 'draft', key: 'draft', scope: 'chat' },
];

test('current-chat backups contain chat domains but never global domains', () => {
  assert.deepEqual(
    selectCurrentChatBackupDomains(domains).map(domain => domain.key),
    ['chat-config', 'content', 'draft'],
  );
});

test('clear generated content excludes every configuration domain', () => {
  assert.deepEqual(
    selectGeneratedContentDomains(domains).map(domain => domain.key),
    ['content', 'draft'],
  );
});

test('current-chat backups cannot run full restore', () => {
  assert.throws(() => assertFullBackupImportAllowed('current-chat'), /不能执行完整恢复/);
  assert.doesNotThrow(() => assertFullBackupImportAllowed('full'));
});

test('missing registered domains and unknown backup domains remain explicit', () => {
  const coverage = analyzeBackupDomainCoverage(domains, ['content'], ['content', 'future-domain']);
  assert.deepEqual(
    coverage.missingDomains.map(domain => domain.key),
    ['global-config', 'chat-config', 'draft'],
  );
  assert.deepEqual(coverage.unknownDomainKeys, ['future-domain']);
});
