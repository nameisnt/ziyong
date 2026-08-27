/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const source = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

test('forum root and domain files have one app-owned directory with one external type consumer', async () => {
  const files = (await readdir(new URL('../../src/apps/forum/', import.meta.url)))
    .filter(file => file.endsWith('.vue') || file.endsWith('.ts'))
    .sort();

  assert.deepEqual(files, [
    'ForumApp.vue',
    'ForumBoardEditorPage.vue',
    'ForumBoardPage.vue',
    'ForumCatalogPage.vue',
    'ForumPreviewPage.vue',
    'ForumRepliesGeneratePage.vue',
    'ForumThreadActions.vue',
    'ForumThreadDetailPage.vue',
    'ForumThreadEditorPage.vue',
    'ForumThreadGeneratePage.vue',
    'useForumBoardEditorSession.ts',
    'useForumDeletionSession.ts',
    'useForumGenerationActions.ts',
    'useForumPreviewSession.ts',
    'useForumThreadEditorSession.ts',
    'useForumThreadGenerationBoardSession.ts',
  ]);

  const builtin = await source('src/apps/builtin.ts');
  const root = await source('src/apps/forum/ForumApp.vue');
  const failedDraftRepair = await source('src/composables/useForumFailedDraftRepair.ts');
  assert.match(builtin, /from '@\/apps\/forum\/ForumApp\.vue'/u);
  assert.equal([...root.matchAll(/from '@\/apps\/forum\/[^']+'/gu)].length, 14);
  assert.match(
    failedDraftRepair,
    /import type \{ ForumGenerationPreview \} from '@\/apps\/forum\/useForumPreviewSession'/u,
  );

  await assert.rejects(access(new URL('../../src/components/ForumApp.vue', import.meta.url)));
  await assert.rejects(access(new URL('../../src/components/forum/', import.meta.url)));
});
