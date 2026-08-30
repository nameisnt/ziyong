/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = relativePath => readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const [phoneOverlay, themeApp, globalCss, detailPage, previewPage, replyList] = await Promise.all([
  readSource('src/components/PhoneOverlay.vue'),
  readSource('src/apps/theme/ThemeApp.vue'),
  readSource('src/global.css'),
  readSource('src/apps/forum/ForumThreadDetailPage.vue'),
  readSource('src/apps/forum/ForumPreviewPage.vue'),
  readSource('src/apps/forum/ForumReplyList.vue'),
]);

test('paper shell and theme preview cover one texture without tiled seams', () => {
  assert.match(phoneOverlay, /backgroundRepeat: 'no-repeat'/u);
  assert.match(phoneOverlay, /backgroundSize: 'cover'/u);
  assert.match(themeApp, /backgroundRepeat: 'no-repeat'/u);
  assert.match(themeApp, /backgroundSize: 'cover'/u);
  assert.doesNotMatch(phoneOverlay, /backgroundRepeat: 'repeat'/u);
});

test('shared soft controls reveal the paper surface instead of using opaque button slabs', () => {
  assert.match(globalCss, /var\(--pc-soft-button-bg\) 58%, transparent 42%/u);
  assert.match(globalCss, /var\(--pc-surface-strong\) 72%, transparent 28%/u);
});

test('forum detail and preview share a flat floor list with an original-poster filter', () => {
  assert.match(detailPage, /<ForumReplyList :replies="replies"/u);
  assert.match(previewPage, /<ForumReplyList/u);
  assert.match(replyList, /只看楼主/u);
  assert.match(replyList, /class="pc-forum-floor"/u);
  assert.match(replyList, /parentFloor\(reply\.parentReplyId\)/u);
  assert.doesNotMatch(detailPage, /pc-reply-card/u);
  assert.doesNotMatch(previewPage, /pc-reply-card/u);
});
