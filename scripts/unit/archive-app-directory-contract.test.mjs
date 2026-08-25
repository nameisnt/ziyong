/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('archive owns its root and three exclusive files without moving runtime services', async () => {
  const files = (await readdir(new URL('../../src/apps/archive/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'ChatArchiveApp.vue',
    'ChatArchiveChatList.vue',
    'ChatArchiveFloorBackupPage.vue',
    'useChatArchiveCatalogSession.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/archive/ChatArchiveApp.vue');
  assert.match(builtin, /from '@\/apps\/archive\/ChatArchiveApp\.vue'/u);
  assert.match(root, /from '@\/store\/generationTasks'/u);
  assert.match(root, /from '@\/store\/phone'/u);
  assert.match(root, /from '@\/util\/tavernNavigation'/u);
  assert.match(root, /from '@\/util\/tavernChatRename'/u);

  await assert.rejects(access(new URL('../../src/components/ChatArchiveApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/archive/', import.meta.url)));
});
