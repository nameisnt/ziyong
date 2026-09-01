/* eslint-disable import-x/no-named-as-default-member, import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadBackupSecrets() {
  const source = await readFile(new URL('../../src/util/backupSecrets.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: 'backupSecrets.ts',
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const { preserveExternalProfileApiKeys } = await loadBackupSecrets();

test('full restore keeps local API keys for matching redacted profiles', () => {
  const staged = [
    { apiKey: '', id: 'same-id', name: 'renamed' },
    { apiKey: '', id: 'new-id', name: 'same-name' },
  ];
  preserveExternalProfileApiKeys(staged, [
    { apiKey: 'id-secret', id: 'same-id', name: 'old-name' },
    { apiKey: 'name-secret', id: 'old-id', name: 'same-name' },
  ]);
  assert.deepEqual(
    staged.map(profile => profile.apiKey),
    ['id-secret', 'name-secret'],
  );
});

test('full restore does not overwrite supplied keys or invent unmatched keys', () => {
  const staged = [
    { apiKey: 'backup-secret', id: 'same-id', name: 'same-name' },
    { apiKey: '', id: 'missing-id', name: 'missing-name' },
  ];
  preserveExternalProfileApiKeys(staged, [{ apiKey: 'local-secret', id: 'same-id', name: 'same-name' }]);
  assert.deepEqual(
    staged.map(profile => profile.apiKey),
    ['backup-secret', ''],
  );
});
