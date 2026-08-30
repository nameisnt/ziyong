/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [archiveProviders, builtins, archiveReader] = await Promise.all([
  readFile(new URL('../../src/apps/builtinArchive.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/apps/builtin.ts', import.meta.url), 'utf8'),
  readFile(new URL('../../src/util/chatArchive.ts', import.meta.url), 'utf8'),
]);

test('built-in content apps own their archive providers', () => {
  for (const app of ['Summary', 'Diary', 'Extras', 'Forum', 'Theater', 'Letters']) {
    assert.match(archiveProviders, new RegExp(`create${app}ArchiveProvider`));
    assert.match(builtins, new RegExp(`archiveProvider: create${app}ArchiveProvider\\(\\)`));
  }
});

test('archive reader consumes only registered providers', () => {
  assert.match(archiveReader, /return getRegisteredPhoneArchiveProviders\(\)/u);
  assert.doesNotMatch(archiveReader, /legacyArchiveProviders|summaryField|DiaryScopeDataSchema/u);
});
