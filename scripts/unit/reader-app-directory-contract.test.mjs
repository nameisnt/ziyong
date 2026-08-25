/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('reader owns its root and chat session while shared reading surfaces remain shared', async () => {
  const files = (await readdir(new URL('../../src/apps/reader/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, ['ReaderApp.vue', 'useReaderChatSession.ts']);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/reader/ReaderApp.vue');
  assert.match(builtin, /from '@\/apps\/reader\/ReaderApp\.vue'/u);
  assert.match(root, /from '@\/components\/ReaderDetailShell\.vue'/u);
  assert.match(root, /from '@\/components\/CatalogModal\.vue'/u);
  assert.match(root, /from '@\/components\/BaguScanPanel\.vue'/u);

  await access(new URL('../../src/components/ReaderDetailShell.vue', import.meta.url));
  await access(new URL('../../src/components/CatalogModal.vue', import.meta.url));
  await access(new URL('../../src/components/BaguScanPanel.vue', import.meta.url));
  await assert.rejects(access(new URL('../../src/components/ReaderApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/reader/', import.meta.url)));
});
