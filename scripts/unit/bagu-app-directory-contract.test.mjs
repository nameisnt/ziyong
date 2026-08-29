/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('bagu owns only its rule-manager root while scan surfaces remain shared', async () => {
  const files = (await readdir(new URL('../../src/apps/bagu/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, ['BaguApp.vue']);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/bagu/BaguApp.vue');
  assert.match(builtin, /import\('@\/apps\/bagu\/BaguApp\.vue'\)/u);
  assert.match(root, /from '@\/store\/bagu'/u);
  assert.match(root, /from '@\/store\/phone'/u);

  await access(new URL('../../src/components/BaguScanPanel.vue', import.meta.url));
  await access(new URL('../../src/components/BaguHitDetailsModal.vue', import.meta.url));
  await access(new URL('../../src/components/BaguDetailPage.vue', import.meta.url));
  await assert.rejects(access(new URL('../../src/components/BaguApp.vue', import.meta.url)));
});
