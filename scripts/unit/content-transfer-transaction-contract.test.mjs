/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/util/contentTransfer.ts', import.meta.url), 'utf8');

test('content transfer uses the shared transactional rollback boundary', () => {
  assert.match(
    source,
    /import\s*\{\s*executeBackupImportTransaction\s*\}\s*from\s*['"]@\/util\/backupTransaction['"]/,
  );
  assert.match(source, /await\s+executeBackupImportTransaction\s*\(\s*\{/);
  assert.match(source, /captureSnapshot:\s*\(\)\s*=>\s*beforeRaw/);
  assert.match(source, /restoreSnapshot:\s*snapshot\s*=>\s*domain\.importData\(snapshot\)/);
  assert.doesNotMatch(source, /catch\s*\(error\)\s*\{\s*domain\.importData\(beforeRaw\)/s);
});
