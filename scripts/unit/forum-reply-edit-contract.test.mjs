/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('forum reply rows open an editor instead of the per-reply regex dialog', () => {
  const list = read('src/apps/forum/ForumReplyList.vue');
  assert.match(list, /v-if="editable && reply\.id"/);
  assert.match(list, /@click="\$emit\('edit', reply\)"/);
  assert.match(list, /aria-label="编辑回复"/);
  assert.doesNotMatch(list, /ContentRegexModal/);
  assert.doesNotMatch(list, /编辑回复正则|本条回复正则替换/);
});

test('the thread detail page hosts the reply editor and forwards the save', () => {
  const page = read('src/apps/forum/ForumThreadDetailPage.vue');
  assert.match(page, /<ForumReplyEditDialog/);
  assert.match(page, /@save="saveReply"/);
  assert.match(page, /emit\('save-reply', reply\.id, input\)/);
  assert.match(page, /editable/);
});

test('the forum app saves reply edits into the viewed version', () => {
  const app = read('src/apps/forum/ForumApp.vue');
  assert.match(app, /@save-reply="saveReply"/);
  assert.match(app, /forum\.updateReply\(/);
  assert.match(app, /viewedForumVersionId\.value/);
});

test('the reply editor dialog edits author, content, and the original poster flag', () => {
  const dialog = read('src/apps/forum/ForumReplyEditDialog.vue');
  assert.match(dialog, /回复作者/);
  assert.match(dialog, /回复内容/);
  assert.match(dialog, /标记为楼主/);
  assert.match(dialog, /emit\('save', \{/);
});
