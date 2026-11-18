/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const forumAppUrl = new URL('../../src/apps/forum/ForumApp.vue', import.meta.url);
const forumPreviewUrl = new URL('../../src/apps/forum/useForumPreviewSession.ts', import.meta.url);
const previewDraftsUrl = new URL('../../src/util/previewDrafts.ts', import.meta.url);

function expectIncludes(source, snippet) {
  assert.ok(source.includes(snippet), `missing: ${snippet}`);
}

describe('forum rewrite previews keep their target', () => {
  it('restores a saved preview through the app normalizer', async () => {
    const source = await readFile(previewDraftsUrl, 'utf8');
    expectIncludes(source, 'normalizePreview?: (preview: TPreview, routeParams: Record<string, string>) => TPreview;');
    expectIncludes(source, 'options.normalizePreview ? options.normalizePreview(restored, { ...saved.routeParams }) : restored,');
  });

  it('rebuilds the rewrite target from the saved route params', async () => {
    const source = await readFile(forumAppUrl, 'utf8');
    expectIncludes(source, 'normalizePreview: (preview, routeParams) => normalizeForumPreview(preview, routeParams),');
    expectIncludes(source, 'function normalizeForumPreview(preview: ForumPreview, routeParams: Record<string, string>): ForumPreview {');
    expectIncludes(source, "targetThreadId: preview.targetThreadId || routeParams.rewriteThreadId || '',");
    expectIncludes(source, "targetVersionId: preview.targetVersionId || routeParams.versionId || '',");
  });

  it('keeps the rewrite thread when going back to the generator', async () => {
    const source = await readFile(forumAppUrl, 'utf8');
    expectIncludes(source, "const targetThreadId = preview.targetThreadId || route.value.params?.rewriteThreadId || '';");
    expectIncludes(source, "toastr.warning('找不到要重写的帖子，无法保留重写状态');");
    expectIncludes(source, '...(targetThreadId ? { rewriteThreadId: targetThreadId } : {}),');
  });

  it('refuses to create a new post when the rewrite target disappeared', async () => {
    const source = await readFile(forumPreviewUrl, 'utf8');
    expectIncludes(source, "if (preview.mode === 'rewrite' && !preview.targetThreadId) {");
    expectIncludes(source, "options.notify.warning('找不到要重写的帖子，无法保存为新版本');");
    expectIncludes(source, "preview.mode === 'rewrite' && preview.targetThreadId");
    expectIncludes(source, 'options.store.appendThreadVersion');
  });
});
