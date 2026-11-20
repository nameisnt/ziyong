/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const forumActions = await readFile(
  new URL('../../src/apps/forum/useForumGenerationActions.ts', import.meta.url),
  'utf8',
);
const lettersApp = await readFile(new URL('../../src/apps/letters/LettersApp.vue', import.meta.url), 'utf8');
const extrasActions = await readFile(
  new URL('../../src/apps/extras/useExtrasGenerationActions.ts', import.meta.url),
  'utf8',
);

function indexOfOrFail(source, pattern, label) {
  const index = source.search(pattern);
  assert.notEqual(index, -1, `缺少：${label}`);
  return index;
}

test('the forum thread rewrite target is captured before generation can outlive the route', () => {
  const snapshot = indexOfOrFail(
    forumActions,
    /const rewriteThreadId = options\.rewriteForumThread\.value\?\.id \|\| '';/u,
    '论坛重写目标快照',
  );
  const awaitIndex = indexOfOrFail(forumActions, /await generateContent\(threadAdapter/u, '论坛主题生成 await');
  assert.ok(snapshot < awaitIndex, '重写目标必须在等待生成之前固定');
  assert.match(forumActions, /const generationMode = options\.threadGenerationMode\.value;/u);
  assert.match(forumActions, /mode: generationMode,\s*targetThreadId: rewriteThreadId,\s*targetVersionId: rewriteVersionId,/u);
  assert.doesNotMatch(forumActions, /targetThreadId: options\.rewriteForumThread\.value\?\.id/u);
});

test('the forum reply generation keeps the version seen when it started', () => {
  const snapshot = indexOfOrFail(
    forumActions,
    /const viewedVersionId = options\.viewedForumVersionId\.value;/u,
    '回复版本快照',
  );
  const awaitIndex = indexOfOrFail(forumActions, /await generateContent\(replyAdapter/u, '论坛回复生成 await');
  assert.ok(snapshot < awaitIndex, '回复版本必须在等待生成之前固定');
  assert.doesNotMatch(forumActions, /await generateContent\(replyAdapter[\s\S]*options\.viewedForumVersionId\.value/u);
});

test('the letters rewrite target is captured before generation can outlive the route', () => {
  const snapshot = indexOfOrFail(lettersApp, /const targetEntryId = rewriteLetterEntry\.value\?\.id \|\| '';/u, '书信重写目标快照');
  const awaitIndex = indexOfOrFail(lettersApp, /await runSingleGeneration\(/u, '书信生成 await');
  assert.ok(snapshot < awaitIndex, '书信重写目标必须在等待生成之前固定');
  const previewBlock = lettersApp.slice(lettersApp.indexOf('generationState.preview = {'));
  assert.match(previewBlock, /mode: generationMode,/u);
  assert.match(previewBlock, /targetEntryId,\s*targetVersionId,/u);
});

test('the extras rewrite base version is captured before generation can outlive the route', () => {
  const snapshot = indexOfOrFail(
    extrasActions,
    /const baseVersionId = options\.viewedChapterVersion\.value\?\.id \|\| '';/u,
    '番外基准版本快照',
  );
  const awaitIndex = indexOfOrFail(extrasActions, /await generateContent\(chapterAdapter/u, '番外章节生成 await');
  assert.ok(snapshot < awaitIndex, '番外基准版本必须在等待生成之前固定');
  assert.doesNotMatch(
    extrasActions,
    /await generateContent\(chapterAdapter[\s\S]*options\.viewedChapterVersion\.value/u,
    '生成结束后不得再读取路由推导的基准版本',
  );
});
