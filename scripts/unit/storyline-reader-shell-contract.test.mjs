/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../src/apps/storylines/StorylineDetailPage.vue', import.meta.url), 'utf8');

test('storyline detail uses the shared reader shell without rebuilding its footer', () => {
  assert.match(source, /import ReaderDetailShell from ['"]@\/components\/ReaderDetailShell\.vue['"]/);
  assert.match(source, /<ReaderDetailShell/);
  assert.match(source, /custom-content/);
  assert.match(source, /@catalog="\$emit\('catalog'\)"/);
  assert.match(source, /@edit="\$emit\('edit'\)"/);
  assert.doesNotMatch(source, /import DetailFooter/);
  assert.doesNotMatch(source, /<DetailFooter/);
});

test('storyline structured sections remain business-owned inside the shared content slot', () => {
  for (const marker of ['剧情概述', '当前目标', '风险与代价', '剧情节点', '伏笔', '关联资料']) {
    assert.match(source, new RegExp(marker));
  }
  assert.match(source, /<template #content>/);
  assert.match(source, /<template #actions>/);
});
